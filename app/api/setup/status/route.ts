import { NextResponse } from 'next/server';
import { getSystemStatus } from '@/lib/config';

export async function GET() {
    try {
        const status = await getSystemStatus();
        return NextResponse.json(status);
    } catch (error: unknown) {
        return NextResponse.json(
            { error: '無法讀取系統狀態', details: (error as Error).message },
            { status: 500 }
        );
    }
}
