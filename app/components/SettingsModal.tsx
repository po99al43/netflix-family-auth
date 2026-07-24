"use client";

import { useState, useEffect } from "react";
import PasswordInput from "./PasswordInput";
import {
	X,
	Lock,
	Key,
	RefreshCw,
	AlertCircle,
	CheckCircle,
	ExternalLink,
	Upload,
	ShieldCheck,
} from "lucide-react";

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function SettingsModal({
	isOpen,
	onClose,
}: SettingsModalProps) {
	// Admin Lock State - 每次打開皆必須重新輸入管理員密碼
	const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
	const [inputAdminPin, setInputAdminPin] = useState("");
	const [adminUnlockError, setAdminUnlockError] = useState("");

	const [activeTab, setActiveTab] = useState<
		"userPin" | "adminPin" | "credentials" | "auth"
	>("userPin");

	// Change User PIN State
	const [newUserPin, setNewUserPin] = useState("");
	const [confirmUserPin, setConfirmUserPin] = useState("");
	const [userPinMsg, setUserPinMsg] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	// Change Admin PIN State
	const [newAdminPin, setNewAdminPin] = useState("");
	const [confirmAdminPin, setConfirmAdminPin] = useState("");
	const [adminPinMsg, setAdminPinMsg] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	// Credentials State
	const [credJson, setCredJson] = useState("");
	const [credMsg, setCredMsg] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	// Auth State
	const [authUrl, setAuthUrl] = useState("");
	const [manualCode, setManualCode] = useState("");
	const [authMsg, setAuthMsg] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	const [loading, setLoading] = useState(false);

	// 每次關閉或開啟 Modal 時重置驗證狀態 (禁止自動從 localStorage 解鎖管理員)
	useEffect(() => {
		if (!isOpen) {
			const timer = setTimeout(() => {
				setIsAdminUnlocked(false);
				setInputAdminPin("");
				setAdminUnlockError("");
				setUserPinMsg(null);
				setAdminPinMsg(null);
				setCredMsg(null);
				setAuthMsg(null);
			}, 0);
			return () => clearTimeout(timer);
		} else {
			const timer = setTimeout(() => {
				setIsAdminUnlocked(false);
				setInputAdminPin("");
				setAdminUnlockError("");
			}, 0);
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	useEffect(() => {
		if (isOpen && isAdminUnlocked) {
			let active = true;
			async function loadUrl() {
				try {
					const res = await fetch("/api/auth/url");
					const data = await res.json();
					if (active && res.ok && data.authUrl) {
						setAuthUrl(data.authUrl);
					}
				} catch (err) {
					console.error("無法取得授權網址", err);
				}
			}
			loadUrl();
			return () => {
				active = false;
			};
		}
	}, [isOpen, isAdminUnlocked]);

	if (!isOpen) return null;

	// Admin Password Unlock Handler
	const handleAdminUnlock = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setAdminUnlockError("");
		try {
			const res = await fetch("/api/auth/verify-admin", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ adminPin: inputAdminPin.trim() }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "管理員密碼錯誤");

			setIsAdminUnlocked(true);
		} catch (err: unknown) {
			setAdminUnlockError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	// 1. Handle Update User Access PIN
	const handleUpdateUserPin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newUserPin.trim().length < 4) {
			setUserPinMsg({ type: "error", text: "家人密碼最少需 4 個位數" });
			return;
		}
		if (newUserPin.trim() !== confirmUserPin.trim()) {
			setUserPinMsg({ type: "error", text: "兩次密碼輸入不一致" });
			return;
		}

		setLoading(true);
		setUserPinMsg(null);
		try {
			const res = await fetch("/api/setup/init", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-admin-pin": inputAdminPin,
				},
				body: JSON.stringify({
					updateTarget: "userPin",
					pin: newUserPin.trim(),
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "家人密碼修改失敗");

			setUserPinMsg({ type: "success", text: "家人存取密碼已成功更新！" });
			setNewUserPin("");
			setConfirmUserPin("");
		} catch (err: unknown) {
			setUserPinMsg({ type: "error", text: (err as Error).message });
		} finally {
			setLoading(false);
		}
	};

	// 2. Handle Update Admin PIN
	const handleUpdateAdminPin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newAdminPin.trim().length < 4) {
			setAdminPinMsg({ type: "error", text: "管理員密碼最少需 4 個位數" });
			return;
		}
		if (newAdminPin.trim() !== confirmAdminPin.trim()) {
			setAdminPinMsg({ type: "error", text: "兩次密碼輸入不一致" });
			return;
		}

		setLoading(true);
		setAdminPinMsg(null);
		try {
			const res = await fetch("/api/setup/init", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-admin-pin": inputAdminPin,
				},
				body: JSON.stringify({
					updateTarget: "adminPin",
					adminPin: newAdminPin.trim(),
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "管理員密碼修改失敗");

			setAdminPinMsg({ type: "success", text: "管理員密碼已成功更新！" });
			setInputAdminPin(newAdminPin.trim());
			setNewAdminPin("");
			setConfirmAdminPin("");
		} catch (err: unknown) {
			setAdminPinMsg({ type: "error", text: (err as Error).message });
		} finally {
			setLoading(false);
		}
	};

	// 3. Handle Save Credentials
	const handleSaveCredentials = async (jsonStr: string) => {
		setLoading(true);
		setCredMsg(null);
		try {
			let parsed: unknown;
			try {
				parsed = JSON.parse(jsonStr);
			} catch {
				throw new Error("無效的 JSON 格式");
			}

			const res = await fetch("/api/setup/init", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-admin-pin": inputAdminPin,
				},
				body: JSON.stringify({ credentialsContent: parsed }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "儲存 credentials.json 失敗");

			setCredMsg({ type: "success", text: "憑證檔案已成功更新！" });
			setCredJson("");
		} catch (err: unknown) {
			setCredMsg({ type: "error", text: (err as Error).message });
		} finally {
			setLoading(false);
		}
	};

	const handleCredFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (evt) => {
			const content = evt.target?.result as string;
			if (content) handleSaveCredentials(content);
		};
		reader.readAsText(file);
	};

	// 4. Handle Manual Auth Token
	const handleManualAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!manualCode.trim()) return;

		setLoading(true);
		setAuthMsg(null);
		try {
			const res = await fetch("/api/auth/manual-token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-admin-pin": inputAdminPin,
				},
				body: JSON.stringify({ codeOrUrl: manualCode.trim() }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "授權碼無效");

			setAuthMsg({ type: "success", text: "Gmail 帳號已成功重新授權！" });
			setManualCode("");
		} catch (err: unknown) {
			setAuthMsg({ type: "error", text: (err as Error).message });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
			<div className="bg-[#181818] border border-[#333] max-w-xl w-full rounded-xl shadow-2xl overflow-hidden flex flex-col">
				{/* Modal Header */}
				<div className="flex justify-between items-center px-6 py-4 border-b border-[#2b2b2b]">
					<h2 className="text-lg font-bold flex items-center gap-2">
						<ShieldCheck className="w-5 h-5 text-[#e50914]" />
						系統設定與管理員選單
					</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#2b2b2b] transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{!isAdminUnlocked ? (
					/* Admin Lock Screen - 每次點擊設定必須輸入管理員密碼 */
					<div className="p-8 flex flex-col items-center">
						<div className="w-14 h-14 bg-[#e50914]/20 rounded-full flex items-center justify-center mb-4 text-[#e50914]">
							<Lock className="w-7 h-7" />
						</div>
						<h3 className="text-xl font-bold mb-2">管理員權限驗證</h3>
						<p className="text-sm text-gray-400 mb-6 text-center">
							請輸入管理員密碼以進入系統設定選單。
						</p>

						<form
							onSubmit={handleAdminUnlock}
							className="w-full space-y-4 max-w-sm"
						>
							<PasswordInput
								value={inputAdminPin}
								onChange={(e) => setInputAdminPin(e.target.value)}
								placeholder="請輸入管理員密碼"
								className="w-full bg-[#2b2b2b] border border-[#444] rounded px-4 py-3 text-center text-lg text-white outline-none focus:border-[#e50914] pl-10 pr-10"
								autoFocus
								required
							/>
							{adminUnlockError && (
								<p className="text-red-500 text-xs text-center">
									{adminUnlockError}
								</p>
							)}
							<button
								type="submit"
								disabled={loading}
								className="w-full bg-[#e50914] hover:bg-[#b81d24] text-white font-bold py-2.5 rounded transition-colors disabled:opacity-50 text-sm"
							>
								驗證解鎖設定
							</button>
						</form>
					</div>
				) : (
					/* Admin Panel Body */
					<>
						{/* Modal Tabs */}
						<div className="flex border-b border-[#2b2b2b] bg-[#141414]">
							<button
								onClick={() => setActiveTab("userPin")}
								className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
									activeTab === "userPin"
										? "border-[#e50914] text-[#e50914] bg-[#181818]"
										: "border-transparent text-gray-400 hover:text-white"
								}`}
							>
								<Lock className="w-3.5 h-3.5" />
								家人密碼
							</button>
							<button
								onClick={() => setActiveTab("adminPin")}
								className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
									activeTab === "adminPin"
										? "border-[#e50914] text-[#e50914] bg-[#181818]"
										: "border-transparent text-gray-400 hover:text-white"
								}`}
							>
								<ShieldCheck className="w-3.5 h-3.5" />
								管理員密碼
							</button>
							<button
								onClick={() => setActiveTab("credentials")}
								className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
									activeTab === "credentials"
										? "border-[#e50914] text-[#e50914] bg-[#181818]"
										: "border-transparent text-gray-400 hover:text-white"
								}`}
							>
								<Key className="w-3.5 h-3.5" />
								憑證 JSON
							</button>
							<button
								onClick={() => setActiveTab("auth")}
								className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
									activeTab === "auth"
										? "border-[#e50914] text-[#e50914] bg-[#181818]"
										: "border-transparent text-gray-400 hover:text-white"
								}`}
							>
								<RefreshCw className="w-3.5 h-3.5" />
								重新授權
							</button>
						</div>

						{/* Modal Body Content */}
						<div className="p-6 space-y-4">
							{/* Tab 1: User PIN */}
							{activeTab === "userPin" && (
								<form onSubmit={handleUpdateUserPin} className="space-y-4">
									<p className="text-xs text-gray-400">
										修改家人用來解鎖查看 Netflix 驗證碼的「家人存取密碼」：
									</p>
									<div>
										<label className="block text-xs font-medium text-gray-400 mb-1">
											新家人密碼
										</label>
										<PasswordInput
											value={newUserPin}
											onChange={(e) => setNewUserPin(e.target.value)}
											placeholder="最少 4 個位數"
											className="w-full bg-[#2b2b2b] border border-[#444] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e50914] pr-9"
											iconSizeClassName="w-4 h-4"
											required
										/>
									</div>

									<div>
										<label className="block text-xs font-medium text-gray-400 mb-1">
											確認新家人密碼
										</label>
										<PasswordInput
											value={confirmUserPin}
											onChange={(e) => setConfirmUserPin(e.target.value)}
											placeholder="再次輸入新家人密碼"
											className="w-full bg-[#2b2b2b] border border-[#444] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e50914] pr-9"
											iconSizeClassName="w-4 h-4"
											required
										/>
									</div>

									{userPinMsg && (
										<div
											className={`p-3 rounded text-sm flex items-center gap-2 ${
												userPinMsg.type === "success"
													? "bg-green-950/50 border border-green-800 text-green-300"
													: "bg-red-950/50 border border-red-800 text-red-300"
											}`}
										>
											{userPinMsg.type === "success" ? (
												<CheckCircle className="w-4 h-4 shrink-0" />
											) : (
												<AlertCircle className="w-4 h-4 shrink-0" />
											)}
											{userPinMsg.text}
										</div>
									)}

									<button
										type="submit"
										disabled={loading}
										className="w-full bg-[#e50914] hover:bg-[#b81d24] text-white font-semibold py-2.5 rounded transition-colors disabled:opacity-50 text-sm"
									>
										更新家人密碼
									</button>
								</form>
							)}

							{/* Tab 2: Admin PIN */}
							{activeTab === "adminPin" && (
								<form onSubmit={handleUpdateAdminPin} className="space-y-4">
									<p className="text-xs text-gray-400">
										修改用於管理員維護、變更設定的「管理員專用密碼」：
									</p>
									<div>
										<label className="block text-xs font-medium text-gray-400 mb-1">
											新管理員密碼
										</label>
										<PasswordInput
											value={newAdminPin}
											onChange={(e) => setNewAdminPin(e.target.value)}
											placeholder="最少 4 個位數"
											className="w-full bg-[#2b2b2b] border border-[#444] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e50914] pr-9"
											iconSizeClassName="w-4 h-4"
											required
										/>
									</div>

									<div>
										<label className="block text-xs font-medium text-gray-400 mb-1">
											確認新管理員密碼
										</label>
										<PasswordInput
											value={confirmAdminPin}
											onChange={(e) => setConfirmAdminPin(e.target.value)}
											placeholder="再次輸入新管理員密碼"
											className="w-full bg-[#2b2b2b] border border-[#444] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e50914] pr-9"
											iconSizeClassName="w-4 h-4"
											required
										/>
									</div>

									{adminPinMsg && (
										<div
											className={`p-3 rounded text-sm flex items-center gap-2 ${
												adminPinMsg.type === "success"
													? "bg-green-950/50 border border-green-800 text-green-300"
													: "bg-red-950/50 border border-red-800 text-red-300"
											}`}
										>
											{adminPinMsg.type === "success" ? (
												<CheckCircle className="w-4 h-4 shrink-0" />
											) : (
												<AlertCircle className="w-4 h-4 shrink-0" />
											)}
											{adminPinMsg.text}
										</div>
									)}

									<button
										type="submit"
										disabled={loading}
										className="w-full bg-[#e50914] hover:bg-[#b81d24] text-white font-semibold py-2.5 rounded transition-colors disabled:opacity-50 text-sm"
									>
										更新管理員密碼
									</button>
								</form>
							)}

							{/* Tab 3: Credentials */}
							{activeTab === "credentials" && (
								<div className="space-y-4">
									<p className="text-xs text-gray-400">
										若您的 Google OAuth API key 過期或需要替換憑證檔：
									</p>

									<div className="border-2 border-dashed border-[#444] hover:border-[#e50914] transition-colors rounded-lg p-6 text-center relative bg-[#222]">
										<input
											type="file"
											accept=".json"
											onChange={handleCredFileUpload}
											className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
										/>
										<Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
										<p className="text-xs font-medium text-gray-200">
											點擊上傳新 credentials.json
										</p>
									</div>

									<div className="space-y-2">
										<label className="block text-xs font-medium text-gray-400">
											或直接貼上 JSON 內容：
										</label>
										<textarea
											rows={4}
											value={credJson}
											onChange={(e) => setCredJson(e.target.value)}
											placeholder='{"installed": {...}}'
											className="w-full bg-[#2b2b2b] border border-[#444] rounded p-2.5 font-mono text-xs text-white focus:outline-none focus:border-[#e50914]"
										/>
										<button
											type="button"
											onClick={() => handleSaveCredentials(credJson)}
											disabled={loading || !credJson.trim()}
											className="w-full bg-[#e50914] hover:bg-[#b81d24] text-white font-semibold py-2 rounded transition-colors disabled:opacity-50 text-sm"
										>
											儲存 JSON 憑證
										</button>
									</div>

									{credMsg && (
										<div
											className={`p-3 rounded text-sm flex items-center gap-2 ${
												credMsg.type === "success"
													? "bg-green-950/50 border border-green-800 text-green-300"
													: "bg-red-950/50 border border-red-800 text-red-300"
											}`}
										>
											{credMsg.type === "success" ? (
												<CheckCircle className="w-4 h-4 shrink-0" />
											) : (
												<AlertCircle className="w-4 h-4 shrink-0" />
											)}
											{credMsg.text}
										</div>
									)}
								</div>
							)}

							{/* Tab 4: Auth */}
							{activeTab === "auth" && (
								<div className="space-y-4">
									<p className="text-xs text-gray-400">
										若 Token 過期或更換 Gmail 帳號，請點擊下方重新授權：
									</p>

									{authUrl && (
										<a
											href={authUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="w-full py-2.5 bg-[#e50914] hover:bg-[#b81d24] text-white font-semibold rounded transition-colors flex items-center justify-center gap-2 text-sm"
										>
											👉 開啟 Google 授權網頁
											<ExternalLink className="w-4 h-4" />
										</a>
									)}

									<form onSubmit={handleManualAuth} className="space-y-2 pt-2 border-t border-[#2b2b2b]">
										<label className="block text-xs font-medium text-gray-400">
											手動輸入 Code 或重新導向網址：
										</label>
										<input
											type="text"
											value={manualCode}
											onChange={(e) => setManualCode(e.target.value)}
											placeholder="貼上完整網址或 Code"
											className="w-full bg-[#2b2b2b] border border-[#444] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e50914]"
										/>
										<button
											type="submit"
											disabled={loading || !manualCode.trim()}
											className="w-full bg-[#383838] hover:bg-[#444] text-white font-medium py-2 rounded transition-colors disabled:opacity-50 text-xs"
										>
											完成授權
										</button>
									</form>

									{authMsg && (
										<div
											className={`p-3 rounded text-sm flex items-center gap-2 ${
												authMsg.type === "success"
													? "bg-green-950/50 border border-green-800 text-green-300"
													: "bg-red-950/50 border border-red-800 text-red-300"
											}`}
										>
											{authMsg.type === "success" ? (
												<CheckCircle className="w-4 h-4 shrink-0" />
											) : (
												<AlertCircle className="w-4 h-4 shrink-0" />
											)}
											{authMsg.text}
										</div>
									)}
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
