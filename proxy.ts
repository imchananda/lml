import { auth } from "@/auth"

export default function proxy(req: any) {
  return auth(req)
}
export const config = {
  matcher: ['/((?!api/auth|login|_next|favicon).*)'],
}
