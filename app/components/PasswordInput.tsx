"use client";

import React, { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordInputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	containerClassName?: string;
	iconSizeClassName?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
	(
		{
			className = "",
			containerClassName = "",
			iconSizeClassName = "w-5 h-5",
			...props
		},
		ref
	) => {
		const [showPassword, setShowPassword] = useState(false);

		return (
			<div className={`relative w-full ${containerClassName}`}>
				<input
					{...props}
					ref={ref}
					type={showPassword ? "text" : "password"}
					className={`${className} ${
						className.includes("pr-") ? "" : "pr-10"
					}`}
				/>
				<button
					type="button"
					onClick={() => setShowPassword((prev) => !prev)}
					tabIndex={-1}
					className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none transition-colors p-1 rounded-full flex items-center justify-center cursor-pointer"
					aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
					title={showPassword ? "隱藏密碼" : "顯示密碼"}
				>
					{showPassword ? (
						<EyeOff className={iconSizeClassName} />
					) : (
						<Eye className={iconSizeClassName} />
					)}
				</button>
			</div>
		);
	}
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
