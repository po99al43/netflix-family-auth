import { google } from 'googleapis';
import fs from 'fs/promises';
import { getCredentialsPath, getTokenPath, saveToken } from './config';
import {
    MULTI_LANG_KEYWORDS_REGEX,
    KEYWORD_NEARBY_CODE_REGEX,
    NETFLIX_UPDATE_LINK_REGEX,
} from './keywords';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export async function getCredentialsData() {
    const credPath = await getCredentialsPath();
    if (!credPath) {
        throw new Error('找不到 credentials.json 憑證檔案');
    }
    const credentialsStr = await fs.readFile(credPath, 'utf-8');
    const credentials = JSON.parse(credentialsStr);
    const client = credentials.installed || credentials.web;
    if (!client) {
        throw new Error('credentials.json 格式錯誤，缺乏 installed 或 web 欄位');
    }
    return { credentials, client };
}

export async function getOAuth2Client(customRedirectUri?: string) {
    const { client } = await getCredentialsData();
    const { client_secret, client_id, redirect_uris } = client;

    let redirectUri = customRedirectUri;
    if (!redirectUri) {
        if (redirect_uris && redirect_uris.length > 0) {
            redirectUri = redirect_uris[0];
        } else {
            redirectUri = 'http://localhost:3000/api/auth/callback';
        }
    }

    return new google.auth.OAuth2(client_id, client_secret, redirectUri);
}

export async function generateAuthUrl(redirectUri?: string) {
    const oAuth2Client = await getOAuth2Client(redirectUri);
    return oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
    });
}

export async function exchangeCodeForTokens(codeOrUrl: string, customRedirectUri?: string) {
    let code = codeOrUrl.trim();
    if (code.includes('code=')) {
        try {
            const urlObj = new URL(code.startsWith('http') ? code : `http://${code}`);
            code = urlObj.searchParams.get('code') || code;
        } catch {
            // keep code as is if URL parsing fails
        }
    }

    const oAuth2Client = await getOAuth2Client(customRedirectUri);
    const { tokens } = await oAuth2Client.getToken(code);
    await saveToken(tokens);
    return tokens;
}

export async function getAuthClient() {
    try {
        const credPath = await getCredentialsPath();
        if (!credPath) {
            throw new Error('找不到 credentials.json。請先上傳憑證。');
        }
        const tokenPath = await getTokenPath();
        if (!tokenPath) {
            throw new Error('找不到 token.json。請先進行 Gmail 授權。');
        }

        const { client } = await getCredentialsData();
        const { client_secret, client_id, redirect_uris } = client;
        const redirectUri = (redirect_uris && redirect_uris.length > 0) ? redirect_uris[0] : 'http://localhost:3000/api/auth/callback';

        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);
        const tokenStr = await fs.readFile(tokenPath, 'utf-8');
        const existingTokens = JSON.parse(tokenStr);
        oAuth2Client.setCredentials(existingTokens);

        // 監聽 Google OAuth 自動刷新 Token 事件，並將新 Token 持久化回存至 token.json
        oAuth2Client.on('tokens', async (tokens) => {
            try {
                const updatedTokens = { ...existingTokens, ...tokens };
                await saveToken(updatedTokens);
            } catch (err) {
                console.error('自動回存刷新 Token 失敗:', err);
            }
        });

        return oAuth2Client;
    } catch (err: unknown) {
        console.error('認證失敗:', (err as Error).message);
        throw new Error((err as Error).message || '無法讀取憑證檔案。');
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBodyData(payload: any): string {
    if (!payload) return '';
    if (payload.mimeType === 'text/html' && payload.body?.data) {
        return payload.body.data;
    }
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
        return payload.body.data;
    }
    if (payload.body?.data) {
        return payload.body.data;
    }
    if (payload.parts && Array.isArray(payload.parts)) {
        for (const part of payload.parts) {
            const data = extractBodyData(part);
            if (data) return data;
        }
    }
    return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getNetflixEmails(auth: any) {
    const gmail = google.gmail({ version: 'v1', auth });

    try {
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: 'from:info@account.netflix.com',
            maxResults: 5,
        });

        const messages = res.data.messages;
        if (!messages || messages.length === 0) {
            return [];
        }

        const emailDetails = [];

        for (const message of messages) {
            const msgRes = await gmail.users.messages.get({
                userId: 'me',
                id: message.id!,
                format: 'full',
            });

            const emailData = msgRes.data;

            const subject = emailData.payload?.headers?.find(h => h.name === 'Subject' || h.name === 'subject')?.value || '無主旨';
            const dateHeader = emailData.payload?.headers?.find(h => h.name === 'Date' || h.name === 'date')?.value;
            const internalDateMs = emailData.internalDate ? Number(emailData.internalDate) : NaN;
            const date = (dateHeader && !isNaN(Date.parse(dateHeader)))
                ? dateHeader
                : (!isNaN(internalDateMs) ? new Date(internalDateMs).toISOString() : new Date().toISOString());

            const bodyData = extractBodyData(emailData.payload);

            let decodedBody = '';
            if (bodyData) {
                decodedBody = Buffer.from(bodyData, 'base64url').toString('utf-8');
            }

            // 提取驗證碼 (限定 4 位數字)
            let code: string | null = null;
            const subjectCodeMatch = subject.match(/(?<!\d)\d{4}(?!\d)/);

            if (subjectCodeMatch) {
                code = subjectCodeMatch[0];
            } else if (MULTI_LANG_KEYWORDS_REGEX.test(subject) || MULTI_LANG_KEYWORDS_REGEX.test(decodedBody)) {
                // 優先在多國語言關鍵字附近 30 個字元內尋找 4 位數字
                const keywordNearMatch = decodedBody.match(KEYWORD_NEARBY_CODE_REGEX);
                if (keywordNearMatch) {
                    code = keywordNearMatch[1];
                } else {
                    // 若關鍵字附近未找到，先剔除版權宣告 (如 © 2026, Copyright 2026) 避免干擾
                    const cleanText = decodedBody
                        .replace(/<[^>]*>?/gm, ' ')
                        .replace(/(?:©|&copy;|copyright|\(c\))\s*\d{4}/gi, '')
                        .replace(/\d{4}\s+netflix/gi, '');
                    const matches = cleanText.matchAll(/(?<!\d)\d{4}(?!\d)/g);
                    for (const match of matches) {
                        code = match[0];
                        break;
                    }
                }
            }

            // 提取專屬連結
            let updateLink: string | null = null;
            const linkMatch = decodedBody.match(NETFLIX_UPDATE_LINK_REGEX);

            if (linkMatch) {
                updateLink = linkMatch[0].replace(/&amp;/g, '&');
                code = null;
            }

            emailDetails.push({
                id: message.id,
                subject,
                date,
                bodyPreview: decodedBody.substring(0, 250).replace(/<[^>]*>?/gm, ''),
                code,
                updateLink,
            });
        }

        return emailDetails;
    } catch (error) {
        console.error('fetch Gmail API fail:', error);
        throw error;
    }
}
