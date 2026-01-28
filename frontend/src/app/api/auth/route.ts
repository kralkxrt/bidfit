import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    try {
        const Body = await req.json();
        const { username, password } = Body;

        // Hardcoded defaults as requested
        const APP_USERNAME = process.env.APP_USERNAME || "pera";
        const APP_PASSWORD = process.env.APP_PASSWORD || "admin123";

        if (username === APP_USERNAME && password === APP_PASSWORD) {
            // Set cookie valid for 7 days
            cookies().set("auth_token", "valid_session", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: "/",
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false }, { status: 401 });
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
