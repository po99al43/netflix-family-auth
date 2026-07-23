import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/gmail';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const redirectUri = `${protocol}://${host}/api/auth/callback`;

    if (error) {
        return NextResponse.redirect(`${protocol}://${host}/?authError=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return NextResponse.redirect(`${protocol}://${host}/?authError=missing_code`);
    }

    try {
        await exchangeCodeForTokens(code, redirectUri);
        return NextResponse.redirect(`${protocol}://${host}/?authSuccess=true`);
    } catch (err: unknown) {
        return NextResponse.redirect(`${protocol}://${host}/?authError=${encodeURIComponent((err as Error).message)}`);
    }
}
