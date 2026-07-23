import { NextRequest, NextResponse } from 'next/server';
import { generateAuthUrl } from '@/lib/gmail';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        let redirectUri = searchParams.get('redirectUri');

        if (!redirectUri) {
            const host = request.headers.get('host') || 'localhost:3000';
            const protocol = request.headers.get('x-forwarded-proto') || 'http';
            redirectUri = `${protocol}://${host}/api/auth/callback`;
        }

        const authUrl = await generateAuthUrl(redirectUri);
        return NextResponse.json({ authUrl, redirectUri });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: '無法建立授權連結，請確認 credentials.json 已上傳', details: (error as Error).message },
            { status: 500 }
        );
    }
}
