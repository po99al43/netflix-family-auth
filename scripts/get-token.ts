import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import * as readline from 'readline';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

async function authorize() {
  try {
    const credentialsStr = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    const credentials = JSON.parse(credentialsStr);
    const client = credentials.installed || credentials.web;
    const { client_secret, client_id } = client;

    // 不使用過期的 oob，改用 localhost 讓瀏覽器轉址
    // 注意：如果是 web 憑證，必須在 GCP 設定 http://localhost:3000 為重新導向 URI
    const redirectUri = 'http://localhost:3000';
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('\n======================================');
    console.log('請在瀏覽器中打開以下網址並授權存取 Gmail：\n');
    console.log(authUrl);
    console.log('\n======================================\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('授權完成後，瀏覽器會跳轉到 localhost（就算畫面顯示無法連線也沒關係）。');
    rl.question('👉 請複製瀏覽器「網址列」的「完整網址」並貼到這裡：\n> ', async (inputUrl) => {
      rl.close();
      try {
        let code = inputUrl;
        // 如果使用者貼上的是完整網址，幫他提取出 code
        if (inputUrl.includes('code=')) {
          const urlObj = new URL(inputUrl.startsWith('http') ? inputUrl : `http://${inputUrl}`);
          code = urlObj.searchParams.get('code') || inputUrl;
        }

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        console.log('\n✅ 授權成功！Token 已儲存至 token.json');
        console.log('現在你可以執行 npm run dev 啟動伺服器了。');
      } catch (err) {
        console.error('\n❌ 取得 Token 失敗:', err);
      }
    });
  } catch (err) {
    console.error('❌ 無法讀取 credentials.json。請確認檔案已放置於專案根目錄。', err);
  }
}

authorize();
