import { NextRequest, NextResponse } from 'next/server';
import {
    getSystemStatus,
    saveCredentials,
    setPin,
    setAdminPin,
    setBothPins,
    verifyAdminPin,
} from '@/lib/config';

export async function POST(request: NextRequest) {
    try {
        const status = await getSystemStatus();
        const body = await request.json();
        const { pin, adminPin, credentialsContent, currentAdminPin, updateTarget } = body;

        const headerAdminPin = request.headers.get('x-admin-pin') || request.headers.get('x-pin');

        // If system already has a PIN, require valid admin PIN to modify settings
        if (status.hasPin) {
            const pinToVerify = currentAdminPin || headerAdminPin;
            if (!pinToVerify || !(await verifyAdminPin(pinToVerify))) {
                return NextResponse.json({ error: '需提供正確的管理員密碼才能進行修改' }, { status: 403 });
            }
        }

        // 1. Initial Setup or changing both PINs
        if (pin && adminPin) {
            if (pin.trim().length < 4 || adminPin.trim().length < 4) {
                return NextResponse.json({ error: '密碼長度最少需為 4 個字元' }, { status: 400 });
            }
            await setBothPins(pin.trim(), adminPin.trim());
        } else if (updateTarget === 'userPin' && pin) {
            if (pin.trim().length < 4) {
                return NextResponse.json({ error: '一般密碼長度最少需為 4 個字元' }, { status: 400 });
            }
            await setPin(pin.trim());
        } else if (updateTarget === 'adminPin' && adminPin) {
            if (adminPin.trim().length < 4) {
                return NextResponse.json({ error: '管理員密碼長度最少需為 4 個字元' }, { status: 400 });
            }
            await setAdminPin(adminPin.trim());
        } else if (pin && !adminPin && !status.hasPin) {
            // First time setup fallback if only pin is supplied: set admin pin same as user pin
            await setBothPins(pin.trim(), pin.trim());
        }

        // 2. Process credentials file if provided
        if (credentialsContent) {
            try {
                await saveCredentials(credentialsContent);
            } catch (err: unknown) {
                return NextResponse.json(
                    { error: (err as Error).message || 'Credentials 格式無效' },
                    { status: 400 }
                );
            }
        }

        const newStatus = await getSystemStatus();
        return NextResponse.json({ success: true, status: newStatus });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: '設定更新失敗', details: (error as Error).message },
            { status: 500 }
        );
    }
}
