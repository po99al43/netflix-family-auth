"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import {
	RefreshCw,
	Mail,
	Key,
	AlertCircle,
	Settings,
	Link,
	Lock,
	CheckCircle2,
	ShieldCheck,
} from "lucide-react";
import SetupWizard from "./components/SetupWizard";
import SettingsModal from "./components/SettingsModal";

interface Email {
	id: string;
	subject: string;
	date: string;
	bodyPreview: string;
	code: string | null;
	updateLink: string | null;
}

interface ApiResponse {
	needsAuth?: boolean;
	emails?: Email[];
	error?: string;
}

interface SystemStatus {
	initialized: boolean;
	hasPin: boolean;
	hasAdminPin: boolean;
	hasCredentials: boolean;
	hasToken: boolean;
}

export default function Home() {
	const [sysStatus, setSysStatus] = useState<SystemStatus | null>(null);
	const [statusLoading, setStatusLoading] = useState(true);

	const [data, setData] = useState<ApiResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// 使用 useSyncExternalStore 讀取外部 localStorage (React 18/19 最佳實踐)
	const storedPin = useSyncExternalStore(
		(callback) => {
			window.addEventListener("storage", callback);
			return () => window.removeEventListener("storage", callback);
		},
		() => (typeof window !== "undefined" ? localStorage.getItem("nf_pin") || "" : ""),
		() => ""
	);

	const [inputPin, setInputPin] = useState<string | null>(null);
	const [unlockedState, setUnlockedState] = useState<boolean | null>(null);

	const pin = inputPin ?? storedPin;
	const isUnlocked = unlockedState ?? Boolean(storedPin);
	const [pinError, setPinError] = useState(false);

	// 設定 Modal 狀態
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

	// 檢查系統 Setup 狀態
	const refreshStatus = useCallback(async () => {
		setStatusLoading(true);
		try {
			const res = await fetch("/api/setup/status");
			const json = await res.json();
			setSysStatus(json);
		} catch (err) {
			console.error("無法檢查系統狀態:", err);
		} finally {
			setStatusLoading(false);
		}
	}, []);

	useEffect(() => {
		let ignore = false;
		async function checkStatus() {
			try {
				const res = await fetch("/api/setup/status");
				const json = await res.json();
				if (!ignore) {
					setSysStatus(json);
					setStatusLoading(false);
				}
			} catch (err) {
				console.error("無法檢查系統狀態:", err);
				if (!ignore) setStatusLoading(false);
			}
		}
		checkStatus();
		return () => {
			ignore = true;
		};
	}, []);

	// 處理 URL 轉址參數 (OAuth Callback 成功與失敗提示)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const searchParams = new URLSearchParams(window.location.search);
		const success = searchParams.get("authSuccess");
		const errorParam = searchParams.get("authError");

		if (success === "true") {
			const timer = setTimeout(() => {
				setSuccessMsg("🎉 Google 帳號授權成功！");
				window.history.replaceState({}, "", window.location.pathname);
				refreshStatus();
			}, 0);
			return () => clearTimeout(timer);
		} else if (errorParam) {
			const timer = setTimeout(() => {
				setError(`授權失敗: ${errorParam}`);
				window.history.replaceState({}, "", window.location.pathname);
			}, 0);
			return () => clearTimeout(timer);
		}
	}, [refreshStatus]);

	const loadData = useCallback(async (currentPin: string) => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/netflix-codes", {
				headers: {
					"x-pin": currentPin,
				},
			});
			const json = await res.json();

			if (res.status === 403) {
				setUnlockedState(false);
				setPinError(true);
				localStorage.removeItem("nf_pin");
				setInputPin("");
				return;
			}

			if (!res.ok && !json.needsAuth) {
				throw new Error(json.error || "讀取失敗");
			}

			setData(json);
		} catch (err: unknown) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!sysStatus?.initialized || !isUnlocked || !pin) return;
		let ignore = false;

		async function fetchData() {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch("/api/netflix-codes", {
					headers: { "x-pin": pin },
				});
				const json = await res.json();
				if (ignore) return;

				if (res.status === 403) {
					setUnlockedState(false);
					setPinError(true);
					localStorage.removeItem("nf_pin");
					setInputPin("");
					return;
				}

				if (!res.ok && !json.needsAuth) {
					throw new Error(json.error || "讀取失敗");
				}

				setData(json);
			} catch (err: unknown) {
				if (!ignore) setError((err as Error).message);
			} finally {
				if (!ignore) setLoading(false);
			}
		}

		fetchData();
		return () => {
			ignore = true;
		};
	}, [sysStatus?.initialized, isUnlocked, pin]);

	const handleUnlock = (e: React.FormEvent) => {
		e.preventDefault();
		localStorage.setItem("nf_pin", pin);
		setUnlockedState(true);
		setInputPin(pin);
		setPinError(false);
	};

	const handleRefresh = async () => {
		if (pin) {
			await loadData(pin);
		}
	};

	// 1. 還在載入系統狀態
	if (statusLoading) {
		return (
			<div className="min-h-screen bg-[#141414] text-white flex flex-col items-center justify-center p-4">
				<RefreshCw className="w-8 h-8 animate-spin text-[#e50914] mb-3" />
				<p className="text-gray-400 text-sm">正在載入系統設定...</p>
			</div>
		);
	}

	// 2. 系統尚未完成初始化嚮導
	if (sysStatus && !sysStatus.initialized) {
		return (
			<SetupWizard
				hasPin={sysStatus.hasPin}
				hasCredentials={sysStatus.hasCredentials}
				hasToken={sysStatus.hasToken}
				onComplete={refreshStatus}
			/>
		);
	}

	// 3. 已初始化但未輸入密碼解鎖
	if (!isUnlocked) {
		return (
			<div className="min-h-screen bg-[#141414] text-white font-sans flex flex-col items-center justify-center p-4">
				<div className="max-w-md w-full bg-[#181818] border border-[#333] p-8 rounded-xl shadow-2xl flex flex-col items-center">
					<div className="w-16 h-16 bg-[#e50914] rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(229,9,20,0.5)]">
						<Lock className="w-8 h-8 text-white" />
					</div>
					<h1 className="text-2xl font-bold mb-2">
						Netflix 家庭驗證碼
					</h1>
					<p className="text-gray-400 mb-8 text-center text-sm">
						請輸入專屬密碼以解鎖存取最新驗證碼
					</p>

					<form
						onSubmit={handleUnlock}
						className="w-full flex flex-col gap-4"
					>
						<input
							type="password"
							inputMode="numeric"
							value={pin}
							onChange={(e) => {
								setInputPin(e.target.value);
								setPinError(false);
							}}
							placeholder="請輸入密碼"
							className={`w-full bg-[#2b2b2b] text-center text-2xl tracking-widest p-4 rounded-md outline-none border transition-colors ${
								pinError
									? "border-red-500"
									: "border-[#444] focus:border-[#e50914]"
							}`}
							autoFocus
						/>
						{pinError && (
							<p className="text-red-500 text-sm text-center">
								密碼錯誤，請再試一次
							</p>
						)}
						<button
							type="submit"
							className="w-full bg-[#e50914] hover:bg-[#b81d24] text-white font-bold py-3 rounded-md transition-colors shadow-lg"
						>
							解鎖存取
						</button>
					</form>
				</div>
			</div>
		);
	}

	// 4. 已解鎖：顯示主面板
	return (
		<div className="min-h-screen bg-[#141414] text-white font-sans selection:bg-[#e50914] selection:text-white flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
			{/* Header */}
			<div className="max-w-3xl w-full flex justify-between items-center mb-8">
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
					<span className="text-[#e50914] font-black text-4xl">
						N
					</span>{" "}
					家庭驗證碼
				</h1>
				<div className="flex items-center gap-3">
					<button
						onClick={() => setIsSettingsOpen(true)}
						className="flex items-center gap-2 px-3.5 py-2 bg-[#2b2b2b] hover:bg-[#383838] transition-colors rounded-md text-sm font-medium text-gray-300 hover:text-white border border-[#444]"
					>
						<ShieldCheck className="w-4 h-4 text-[#e50914]" />
						系統設定 (管理員)
					</button>
					<button
						onClick={handleRefresh}
						disabled={loading}
						className="flex items-center gap-2 px-4 py-2 bg-[#e50914] hover:bg-[#b81d24] transition-colors rounded-md text-sm font-bold text-white shadow-md disabled:opacity-50"
					>
						<RefreshCw
							className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
						/>
						重新整理
					</button>
				</div>
			</div>

			{/* Main Content */}
			<main className="max-w-3xl w-full">
				{successMsg && (
					<div className="bg-green-950/50 border border-green-700 text-green-200 p-4 rounded-md flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<CheckCircle2 className="w-5 h-5 shrink-0 text-green-400" />
							<p className="text-sm font-medium">{successMsg}</p>
						</div>
						<button
							onClick={() => setSuccessMsg(null)}
							className="text-xs text-green-400 underline"
						>
							關閉
						</button>
					</div>
				)}

				{error && (
					<div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-md flex items-start gap-3 mb-6">
						<AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
						<p>{error}</p>
					</div>
				)}

				{loading && !data ? (
					<div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
						<RefreshCw className="w-8 h-8 animate-spin text-[#e50914]" />
						<p>正在搜尋 Gmail 中的 Netflix 郵件...</p>
					</div>
				) : data?.needsAuth ? (
					<div className="bg-[#181818] border border-[#333] p-8 rounded-lg text-center flex flex-col items-center gap-6">
						<div className="w-16 h-16 bg-[#2b2b2b] rounded-full flex items-center justify-center">
							<Settings className="w-8 h-8 text-yellow-500" />
						</div>
						<div>
							<h2 className="text-xl font-semibold mb-2 text-yellow-500">
								Gmail 授權已失效
							</h2>
							<p className="text-gray-400 max-w-md mx-auto mb-4 text-sm">
								伺服器無法連線至 Gmail
								API。請通知管理員點擊上方「系統設定」進行重新授權。
							</p>
							<button
								onClick={() => setIsSettingsOpen(true)}
								className="px-5 py-2.5 bg-[#e50914] text-white rounded-md font-semibold hover:bg-[#b81d24] transition-colors"
							>
								開啟管理員設定面板
							</button>
						</div>
					</div>
				) : data?.emails && data.emails.length > 0 ? (
					<div className="space-y-4">
						{data.emails.map((email) => (
							<div
								key={email.id}
								className="bg-[#181818] border border-[#333] p-6 rounded-xl hover:border-[#444] transition-colors shadow-lg"
							>
								<div className="flex justify-between items-start mb-4">
									<h2 className="font-medium text-lg leading-snug pr-4">
										{email.subject}
									</h2>
									<span className="text-xs text-gray-400 whitespace-nowrap bg-[#2b2b2b] px-2.5 py-1 rounded-md border border-[#383838]">
										{email.date && !isNaN(Date.parse(email.date))
											? new Date(email.date).toLocaleString("zh-TW", {
													month: "short",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
											  })
											: "剛剛"}
									</span>
								</div>

								{email.updateLink ? (
									<div className="bg-[#252525] rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between border border-[#3d3d3d] gap-4">
										<div className="flex items-center gap-3 w-full sm:w-auto">
											<Link className="w-5 h-5 text-blue-400 shrink-0" />
											<span className="text-sm text-gray-300">
												這是一封驗證連結信件：
											</span>
										</div>
										<a
											href={email.updateLink}
											target="_blank"
											rel="noopener noreferrer"
											className="w-full sm:w-auto text-center px-6 py-2.5 bg-[#e50914] hover:bg-[#b81d24] transition-colors text-white font-bold rounded-md shadow-md"
										>
											👉 點此取得暫時存取碼
										</a>
									</div>
								) : email.code ? (
									<div className="bg-[#252525] rounded-lg p-6 flex flex-col items-center justify-center border border-[#3d3d3d] shadow-lg">
										<div className="flex items-center gap-2 mb-3">
											<Key className="w-5 h-5 text-[#e50914]" />
											<span className="text-gray-300 font-medium">
												Netflix 登入代碼
											</span>
										</div>
										<div className="bg-black/60 px-10 py-4 rounded-xl border border-[#444] shadow-inner">
											<span className="text-6xl font-mono font-black tracking-[0.25em] text-white ml-[0.25em]">
												{email.code}
											</span>
										</div>
									</div>
								) : (
									<p className="text-sm text-gray-400 line-clamp-2">
										{email.bodyPreview}
									</p>
								)}
							</div>
						))}
					</div>
				) : (
					<div className="bg-[#181818] border border-[#333] p-12 rounded-xl text-center text-gray-400 flex flex-col items-center">
						<Mail className="w-12 h-12 mb-4 opacity-40 text-[#e50914]" />
						<p className="text-base font-medium">
							目前沒有找到任何 Netflix 的驗證信件。
						</p>
						<p className="text-xs text-gray-500 mt-1">
							您可以點擊上方「重新整理」拉取最新信件。
						</p>
					</div>
				)}
			</main>

			{/* Settings Modal */}
			<SettingsModal
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
			/>
		</div>
	);
}
