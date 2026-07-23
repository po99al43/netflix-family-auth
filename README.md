# Netflix 家庭驗證碼自助系統 (Self-Hosted Version)

這是一個基於 Next.js 建立的私有化工具，專門用來自動讀取 Gmail 中的 Netflix 驗證信，並提供美觀的網頁介面給遠端的家人查看 4 位數驗證碼與「更新同戶裝置 / 暫時存取碼」連結。

---

## 🌟 特色亮點

1. **零設定快速架設 (1-Click Docker)**：無需事前手動下載憑證或設定 `.env`，啟動後全網頁嚮導初始化！
2. **首次啟動嚮導 (Setup Wizard)**：第一次打開網頁即可進行：
   - 自行設定存取密碼 (PIN 碼)
   - 網頁上傳或貼上 `credentials.json`
   - 一鍵開啟 Google 登入完成 Gmail API 授權
3. **安全存取鎖與密碼 Hash**：採用 SHA-512 + Salt 雜湊儲存密碼，保護信件內容不被外人查看。
4. **系統管理面板 (Settings Modal)**：解鎖後可隨時於網頁修改密碼、更換憑證或重新授權 Gmail。
5. **資料持久化**：所有設定與 Token 集中儲存於 `./data` 目錄，支援 Docker 單一 Volume 掛載。

---

## 🚀 快速開始 (使用 Docker 部署 - 推薦)

### 步驟 1：啟動 Docker 容器

不需要事先建立任何檔案，直接執行：

```bash
docker-compose up -d --build
```

容器將會在 `http://localhost:3000` (或您的伺服器 IP:3000) 啟動。

### 步驟 2：網頁端初始化

1. 用瀏覽器開啟 `http://localhost:3000`。
2. 系統會自動進入 **首次啟動嚮導**：
   - **步驟 1：設定存取密碼**：輸入您與家人存取此網站的密碼。
   - **步驟 2：上傳 credentials.json**：
     - 前往 [Google Cloud Console](https://console.cloud.google.com/) 建立專案並開啟 **Gmail API**。
     - 建立 **OAuth Client ID**（類型選擇「網頁應用程式」或「電腦版」）。
     - 設定重新導向 URI 為 `http://<your-ip-or-domain>:3000/api/auth/callback`。
     - 下載 JSON 憑證，並在此步驟直接點擊上傳或貼上內容。
   - **步驟 3：完成 Google 授權**：
     - 點擊「開啟 Google 登入授權頁面」，登入收受 Netflix 信件的 Gmail 帳號並授權即可完成！

---

## 🛠️ 本機開發 (Local Development)

若要直接在本機執行：

```bash
# 安裝套件
npm install

# 啟動開發伺服器
npm run dev
```

瀏覽器打開 `http://localhost:3000` 即可進行網頁初始化設定。

---

## 🔒 檔案說明與備份

- `./data/config.json`：儲存雜湊後的存取密碼
- `./data/credentials.json`：Google OAuth 憑證
- `./data/token.json`：Gmail 存取 Token

> **注意：** 請勿將 `./data` 目錄提交至公開 Git 儲存庫。備份時僅需備份 `./data` 資料夾即可完整保留系統狀態。

---

## ⚠️ 免責聲明 (Disclaimer)

- **非官方聲明**：本專案為個人開源自動化工具，僅透過 Google 官方 Gmail API 讀取並解析使用者授權信箱中收到的 notification 驗證信件。本專案與 Netflix, Inc. 或 Google LLC 無任何商業關聯、授權或贊助關係。
- **使用條款**：本工具僅供個人與家庭內部自動化管理與閱讀信件使用。使用者需自行確保其使用方式符合第三方平台（如 Netflix、Google）之服務條款。
- **免責保證**：本軟體按「現狀」（AS IS）提供，不保證任何明示或暗示之擔保。開發者對於因使用本軟體或衍生行為所造成之任何直接、間接損害、帳號限制或資料損失概不負責。

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權。


