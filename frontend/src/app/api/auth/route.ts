import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    try {
        // const Body = await req.json();
        // const { username, password } = Body;

        // Always permit access without checking credentials
        cookies().set("auth_token", "valid_session", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/",
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
