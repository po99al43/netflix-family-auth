import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPin } from '@/lib/config';

export async function POST(request: NextRequest) {
    try {
        const { adminPin } = await request.json();
        const headerAdminPin = request.headers.get('x-admin-pin');
        const pinToVerify = adminPin || headerAdminPin;

        if (!pinToVerify || !(await verifyAdminPin(pinToVerify))) {
            return NextResponse.json({ error: '管理員密碼錯誤' }, { status: 403 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: '驗證失敗', details: (error as Error).message },
            { status: 500 }
        );
    }
}
