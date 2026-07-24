import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/gmail';
import { verifyAdminPin, getSystemStatus } from '@/lib/config';

export async function POST(request: NextRequest) {
    try {
        const status = await getSystemStatus();
        const adminPin = request.headers.get('x-admin-pin');

        if (status.hasPin) {
            if (!adminPin || !(await verifyAdminPin(adminPin))) {
                return NextResponse.json({ error: '需提供正確的管理員密碼才能授權' }, { status: 403 });
            }
        }

        const { codeOrUrl, redirectUri } = await request.json();
        if (!codeOrUrl) {
            return NextResponse.json({ error: '請提供授權碼或完整網址' }, { status: 400 });
        }

        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const fallbackRedirectUri = `${protocol}://${host}/api/auth/callback`;

        await exchangeCodeForTokens(codeOrUrl, redirectUri || fallbackRedirectUri);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: '授權碼無效或已過期', details: (error as Error).message },
            { status: 400 }
        );
    }
}
