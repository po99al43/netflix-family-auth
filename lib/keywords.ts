/**
 * Netflix 郵件關鍵字與語系比對設定檔
 * 可依需求自由擴充其他語系（如韓文、法文、西文等）
 */

// 驗證碼搜尋關鍵字清單
export const CODE_KEYWORDS = [
    // 繁體中文
    '驗證碼',
    '存取碼',
    '代碼',
    '驗證',
    // 簡體中文
    '验证码',
    '代码',
    '验证',
    // 日文
    '認證',
    '認証',
    // 英文
    'verification',
    'verify',
    'code',
    'passcode',
    'pin',
];

// Netflix 驗證與戶籍設定連結路徑關鍵字
export const LINK_PATH_PATTERNS = [
    'youraccount',
    'account',
    'verify',
    'manage-household',
    'tv8',
];

// 動態建立多語系關鍵字檢測正則
export const MULTI_LANG_KEYWORDS_REGEX = new RegExp(CODE_KEYWORDS.join('|'), 'i');

// 關鍵字鄰近 (30字元內) 4 位數驗證碼擷取正則
export const KEYWORD_NEARBY_CODE_REGEX = new RegExp(
    `(?:${CODE_KEYWORDS.join('|')})[^\\d]{0,30}(?<!\\d)(\\d{4})(?!\\d)`,
    'i'
);

// Netflix 專屬網址比對正則
export const NETFLIX_UPDATE_LINK_REGEX = new RegExp(
    `https://(?:www\\.)?netflix\\.com/(?:${LINK_PATH_PATTERNS.join('|')})/[^"'\\s>]+`,
    'i'
);
