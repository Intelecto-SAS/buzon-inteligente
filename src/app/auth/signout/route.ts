import { createUserClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createUserClient();
  await supabase?.auth.signOut();
  const target = process.env.NEXT_PUBLIC_SUPABASE_URL ? "/login" : "/dashboard";
  return NextResponse.redirect(new URL(target, request.url), { status: 303 });
}
