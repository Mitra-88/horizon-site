import { NextResponse, type NextRequest } from "next/server";
import { getSubmissions } from "@/components/mods-data";

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

/** The registry pull requests the submission form opened for `login`, newest first ("Your mods"). */
export async function GET(request: NextRequest) {
  const login = request.nextUrl.searchParams.get("login") ?? "";
  if (!LOGIN.test(login)) return NextResponse.json({ error: "Not a GitHub login." }, { status: 400 });
  const submissions = await getSubmissions(login);
  if (!submissions) return NextResponse.json({ error: "GitHub didn't answer." }, { status: 502 });
  return NextResponse.json(submissions);
}
