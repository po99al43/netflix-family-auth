import { NextRequest, NextResponse } from 'next/server';
import { getAuthClient, getNetflixEmails } from '@/lib/gmail';
import { verifyPin, getSystemStatus } from '@/lib/config';

export async function GET(request: NextRequest) {
    // Check system status first
    const status = await getSystemStatus();
    if (!status.initialized) {
        return NextResponse.json(
            { needsSetup: true, status, error: '系統未完成設定' },
            { status: 200 }
        );
    }

    // 後端 API 密碼驗證
    const pin = request.headers.get('x-pin');
    if (!pin || !(await verifyPin(pin))) {
        return NextResponse.json({ error: '密碼錯誤' }, { status: 403 });
    }

    try {
        const client = await getAuthClient();
        const emails = await getNetflixEmails(client);

        return NextResponse.json({ needsAuth: false, emails });
    } catch (error: unknown) {
        const errorMessage = (error as Error).message;

        if (errorMessage.includes('token.json') || errorMessage.includes('credentials.json')) {
            return NextResponse.json(
                { needsAuth: true, error: '系統未設定憑證', details: errorMessage },
                { status: 401 }
            );
        }

        return NextResponse.json({ error: '伺服器錯誤', details: errorMessage }, { status: 500 });
    }
}
