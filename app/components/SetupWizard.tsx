"use client";

import { useState } from "react";
import PasswordInput from "./PasswordInput";
import {
	Key,
	Upload,
	CheckCircle2,
	Lock,
	ShieldCheck,
	ArrowRight,
	ExternalLink,
	Copy,
	Check,
	AlertCircle,
	FileText,
	ShieldAlert,
} from "lucide-react";

interface SetupWizardProps {
	hasPin: boolean;
	hasCredentials: boolean;
	hasToken: boolean;
	onComplete: () => void;
}

export default function SetupWizard({
	hasPin: initialHasPin,
	hasCredentials: initialHasCredentials,
	hasToken: initialHasToken,
	onComplete,
}: SetupWizardProps) {
	const [step, setStep] = useState<number>(() => {
		if (!initialHasPin) return 1;
		if (!initialHasCredentials) return 2;
		if (!initialHasToken) return 3;
		return 1;
	});

	// Step 1: User PIN & Admin PIN (內存狀態，不上傳至 localStorage)
	const [userPin, setUserPin] = useState("");
	const [sameAsUser, setSameAsUser] = useState(true);
	const [adminPin, setAdminPin] = useState("");
	const [confirmAdminPin, setConfirmAdminPin] = useState("");
	const [pinError, setPinError] = useState("");

	// Step 2: Credentials
	const [credMode, setCredMode] = useState<"file" | "paste">("file");
	const [credJsonText, setCredJsonText] = useState("");
	const [credError, setCredError] = useState("");

	// Step 3: Auth
	const [authUrl, setAuthUrl] = useState("");
	const [manualCode, setManualCode] = useState("");
	const [authError, setAuthError] = useState("");
	const [copiedCallback, setCopiedCallback] = useState(false);

	const [loading, setLoading] = useState(false);

	// Helper for Step 1: Set PINs
	const handleSetPin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (userPin.trim().length < 4) {
			setPinError("家人密碼最少需要 4 個位數");
			return;
		}

		const finalAdminPin = sameAsUser ? userPin.trim() : adminPin.trim();
		if (!sameAsUser) {
			if (finalAdminPin.length < 4) {
				setPinError("管理員密碼最少需要 4 個位數");
				return;
			}
			if (finalAdminPin !== confirmAdminPin.trim()) {
				setPinError("兩次輸入的管理員密碼不一致");
				return;
			}
		}

		setLoading(true);
		setPinError("");
		try {
			const res = await fetch("/api/setup/init", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					pin: userPin.trim(),
					adminPin: finalAdminPin,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "設定密碼失敗");

			// 只將家人 PIN 記錄到 localStorage 供預設解鎖，管理員密碼不留底
			localStorage.setItem("nf_pin", userPin.trim());
			setStep(2);
		} catch (err: unknown) {
			setPinError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	// Helper for Step 2: Credentials JSON
	const handleSaveCredentials = async (jsonString: string) => {
		setLoading(true);
		setCredError("");
		try {
			let parsed: unknown;
			try {
				parsed = JSON.parse(jsonString);
			} catch {
				throw new Error("無效的 JSON 格式，請確認內容是否正確");
			}

			const currentAdminPin = sameAsUser ? userPin.trim() : adminPin.trim();
			const res = await fetch("/api/setup/init", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-admin-pin": currentAdminPin,
				},
				body: JSON.stringify({ credentialsContent: parsed }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "儲存憑證失敗");

			await fetchAuthUrl();
			setStep(3);
		} catch (err: unknown) {
			setCredError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (event) => {
			const content = event.target?.result as string;
			if (content) {
				handleSaveCredentials(content);
			}
		};
		reader.readAsText(file);
	};

	// Helper for Step 3: OAuth
	const fetchAuthUrl = async () => {
		try {
			const res = await fetch("/api/auth/url");
			const data = await res.json();
			if (res.ok && data.authUrl) {
				setAuthUrl(data.authUrl);
			}
		} catch (err) {
			console.error("無法取得授權網址", err);
		}
	};

	const handleManualAuthSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!manualCode.trim()) return;

		setLoading(true);
		setAuthError("");
		try {
			const currentAdminPin = sameAsUser ? userPin.trim() : adminPin.trim();
			const res = await fetch("/api/auth/manual-token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-admin-pin": currentAdminPin,
				},
				body: JSON.stringify({ codeOrUrl: manualCode.trim() }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "驗證失敗");

			onComplete();
		} catch (err: unknown) {
			setAuthError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	const callbackUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/api/auth/callback`
			: "http://localhost:3000/api/auth/callback";

	const handleCopyCallback = () => {
		navigator.clipboard.writeText(callbackUrl);
		setCopiedCallback(true);
		setTimeout(() => setCopiedCallback(false), 2000);
	};

	return (
		<div className="min-h-screen bg-[#141414] text-white font-sans flex flex-col items-center justify-center p-4">
			<div className="max-w-2xl w-full bg-[#181818] border border-[#333] p-8 rounded-xl shadow-2xl">
				{/* Step Header */}
				<div className="flex items-center justify-between mb-8 pb-6 border-b border-[#2b2b2b]">
					<div>
						<h1 className="text-2xl font-bold flex items-center gap-2">
							<ShieldCheck className="w-7 h-7 text-[#e50914]" />
							Netflix 驗證碼系統初始化
						</h1>
						<p className="text-sm text-gray-400 mt-1">
							首次啟動嚮導：請依序完成以下 3 個步驟設定
						</p>
					</div>

					<div className="flex items-center gap-2">
						{[1, 2, 3].map((s) => (
							<div
								key={s}
								className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
									step === s
										? "bg-[#e50914] text-white ring-4 ring-[#e50914]/30"
										: step > s
										? "bg-green-600 text-white"
										: "bg-[#2b2b2b] text-gray-500"
								}`}
							>
								{step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
							</div>
						))}
					</div>
				</div>

				{/* Step 1: Set User PIN & Admin PIN */}
				{step === 1 && (
					<form onSubmit={handleSetPin} className="space-y-6">
						<div className="flex items-center gap-3 text-lg font-semibold text-gray-200">
							<Lock className="w-5 h-5 text-[#e50914]" />
							步驟 1：設定存取密碼與管理員密碼
						</div>
						<p className="text-sm text-gray-400">
							請設定家人解鎖用的「存取密碼」以及修改系統設定用的「管理員密碼」。
						</p>

						<div className="space-y-4">
							<div>
								<label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
									<Lock className="w-3.5 h-3.5 text-blue-400" />
									家人存取密碼 (查看 Netflix 驗證碼用)
								</label>
								<PasswordInput
									value={userPin}
									onChange={(e) => setUserPin(e.target.value)}
									placeholder="請輸入 4 位數以上家人存取密碼"
									className="w-full bg-[#2b2b2b] border border-[#444] rounded-md px-4 py-3 text-white focus:outline-none focus:border-[#e50914] pr-10"
									required
									autoFocus
								/>
							</div>

							<div className="pt-2 border-t border-[#2b2b2b]">
								<label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 mb-3">
									<input
										type="checkbox"
										checked={sameAsUser}
										onChange={(e) => setSameAsUser(e.target.checked)}
										className="w-4 h-4 accent-[#e50914] rounded cursor-pointer"
									/>
									<span>管理員密碼與家人存取密碼相同</span>
								</label>

								{!sameAsUser && (
									<div className="space-y-3 bg-[#222] p-4 rounded-lg border border-[#333]">
										<div className="flex items-center gap-2 text-xs text-yellow-500 font-medium mb-1">
											<ShieldAlert className="w-4 h-4" />
											管理員密碼將用於爾後變更密碼、更換憑證與重新授權
										</div>
										<div>
											<label className="block text-xs font-medium text-gray-400 mb-1">
												設定管理員密碼
											</label>
											<PasswordInput
												value={adminPin}
												onChange={(e) => setAdminPin(e.target.value)}
												placeholder="請輸入管理員專用密碼"
												className="w-full bg-[#2b2b2b] border border-[#444] rounded-md px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#e50914] pr-10"
												required={!sameAsUser}
											/>
										</div>

										<div>
											<label className="block text-xs font-medium text-gray-400 mb-1">
												再次確認管理員密碼
											</label>
											<PasswordInput
												value={confirmAdminPin}
												onChange={(e) => setConfirmAdminPin(e.target.value)}
												placeholder="請再次輸入管理員密碼"
												className="w-full bg-[#2b2b2b] border border-[#444] rounded-md px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#e50914] pr-10"
												required={!sameAsUser}
											/>
										</div>
									</div>
								)}
							</div>
						</div>

						{pinError && (
							<div className="p-3 bg-red-950/50 border border-red-800 rounded-md text-red-300 text-sm flex items-center gap-2">
								<AlertCircle className="w-4 h-4 shrink-0" />
								{pinError}
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-[#e50914] hover:bg-[#b81d24] text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
						>
							下一步：上傳 Google 憑證
							<ArrowRight className="w-4 h-4" />
						</button>
					</form>
				)}

				{/* Step 2: Upload credentials.json */}
				{step === 2 && (
					<div className="space-y-6">
						<div className="flex items-center gap-3 text-lg font-semibold text-gray-200">
							<Key className="w-5 h-5 text-[#e50914]" />
							步驟 2：提供 credentials.json 憑證
						</div>

						<div className="bg-[#222] border border-[#333] rounded-lg p-4 text-xs text-gray-300 space-y-2">
							<p className="font-semibold text-yellow-500 flex items-center gap-1">
								💡 如何取得 credentials.json？
							</p>
							<ol className="list-decimal list-inside space-y-1 text-gray-400">
								<li>
									前往{" "}
									<a
										href="https://console.cloud.google.com/"
										target="_blank"
										rel="noreferrer"
										className="text-blue-400 underline inline-flex items-center gap-0.5"
									>
										Google Cloud Console <ExternalLink className="w-3 h-3" />
									</a>{" "}
									建立專案並開啟 <b>Gmail API</b>。
								</li>
								<li>
									建立「OAuth 用戶端 ID」憑證（選擇「網頁應用程式」或「電腦版」）。
								</li>
								<li>
									設定重導向 URI 為：
									<span className="bg-[#141414] text-gray-200 px-1.5 py-0.5 rounded font-mono ml-1 select-all inline-flex items-center gap-1">
										{callbackUrl}
										<button
											onClick={handleCopyCallback}
											type="button"
											className="text-gray-400 hover:text-white"
										>
											{copiedCallback ? (
												<Check className="w-3 h-3 text-green-400" />
											) : (
												<Copy className="w-3 h-3" />
											)}
										</button>
									</span>
								</li>
								<li>下載 JSON 檔案並上傳於下方。</li>
							</ol>
						</div>

						{/* Mode Toggle */}
						<div className="flex gap-2 bg-[#2b2b2b] p-1 rounded-md">
							<button
								type="button"
								onClick={() => setCredMode("file")}
								className={`flex-1 py-2 text-sm font-medium rounded ${
									credMode === "file"
										? "bg-[#181818] text-white"
										: "text-gray-400 hover:text-white"
								}`}
							>
								上傳 credentials.json 檔案
							</button>
							<button
								type="button"
								onClick={() => setCredMode("paste")}
								className={`flex-1 py-2 text-sm font-medium rounded ${
									credMode === "paste"
										? "bg-[#181818] text-white"
										: "text-gray-400 hover:text-white"
								}`}
							>
								直接貼上 JSON 內容
							</button>
						</div>

						{credMode === "file" ? (
							<div className="border-2 border-dashed border-[#444] hover:border-[#e50914] transition-colors rounded-lg p-8 text-center cursor-pointer relative bg-[#222]">
								<input
									type="file"
									accept=".json"
									onChange={handleFileUpload}
									className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
								/>
								<Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
								<p className="font-medium text-gray-200">
									點擊上傳或拖曳 credentials.json 檔案至此
								</p>
								<p className="text-xs text-gray-500 mt-1">只支援 .json 檔案</p>
							</div>
						) : (
							<div className="space-y-3">
								<textarea
									rows={6}
									value={credJsonText}
									onChange={(e) => setCredJsonText(e.target.value)}
									placeholder='{"installed": {"client_id": "...", "client_secret": "..."}}'
									className="w-full bg-[#2b2b2b] border border-[#444] rounded-md p-3 font-mono text-xs text-gray-200 focus:outline-none focus:border-[#e50914]"
								/>
								<button
									type="button"
									onClick={() => handleSaveCredentials(credJsonText)}
									disabled={loading || !credJsonText.trim()}
									className="w-full bg-[#e50914] hover:bg-[#b81d24] text-white font-bold py-3 rounded-md transition-colors disabled:opacity-50"
								>
									儲存憑證並繼續
								</button>
							</div>
						)}

						{credError && (
							<div className="p-3 bg-red-950/50 border border-red-800 rounded-md text-red-300 text-sm flex items-center gap-2">
								<AlertCircle className="w-4 h-4 shrink-0" />
								{credError}
							</div>
						)}
					</div>
				)}

				{/* Step 3: Google OAuth Authorization */}
				{step === 3 && (
					<div className="space-y-6">
						<div className="flex items-center gap-3 text-lg font-semibold text-gray-200">
							<FileText className="w-5 h-5 text-[#e50914]" />
							步驟 3：完成 Google 帳號授權
						</div>
						<p className="text-sm text-gray-400">
							請點擊下方按鈕登入含有 Netflix 信件的 Gmail 帳號進行授權。
						</p>

						<div className="bg-[#222] border border-[#333] p-6 rounded-lg text-center flex flex-col items-center gap-4">
							<p className="text-sm text-gray-300">
								點擊授權將前往 Google 官方登入頁面：
							</p>
							{authUrl ? (
								<a
									href={authUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="px-6 py-3 bg-[#e50914] hover:bg-[#b81d24] text-white font-bold rounded-md transition-colors flex items-center gap-2 text-base shadow-lg"
								>
									👉 開啟 Google 登入授權頁面
									<ExternalLink className="w-4 h-4" />
								</a>
							) : (
								<button
									onClick={fetchAuthUrl}
									className="px-4 py-2 bg-[#2b2b2b] text-gray-300 rounded hover:bg-[#383838]"
								>
									取得授權連結
								</button>
							)}
						</div>

						<div className="relative flex py-2 items-center">
							<div className="flex-grow border-t border-[#333]"></div>
							<span className="flex-shrink mx-4 text-xs text-gray-500">
								或者 (相容 Desktop App / 手動貼上模式)
							</span>
							<div className="flex-grow border-t border-[#333]"></div>
						</div>

						{/* Manual Code Input */}
						<form onSubmit={handleManualAuthSubmit} className="space-y-3">
							<label className="block text-xs font-medium text-gray-400">
								若瀏覽器跳轉後顯示網址或 authorization code，請貼在下方：
							</label>
							<input
								type="text"
								value={manualCode}
								onChange={(e) => setManualCode(e.target.value)}
								placeholder="貼上網址 (http://localhost:3000/?code=...) 或 Code"
								className="w-full bg-[#2b2b2b] border border-[#444] rounded-md px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#e50914]"
							/>
							<button
								type="submit"
								disabled={loading || !manualCode.trim()}
								className="w-full bg-[#383838] hover:bg-[#444] text-white font-medium py-2.5 rounded-md transition-colors disabled:opacity-50 text-sm"
							>
								完成手動驗證
							</button>
						</form>

						{authError && (
							<div className="p-3 bg-red-950/50 border border-red-800 rounded-md text-red-300 text-sm flex items-center gap-2">
								<AlertCircle className="w-4 h-4 shrink-0" />
								{authError}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
