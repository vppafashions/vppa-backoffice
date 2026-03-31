import Link from "next/link";

import { LoginForm } from "../../_components/login-form";

export default function LoginV1() {
  return (
    <div className="flex h-dvh">
      <div className="hidden bg-black lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <div className="mx-auto space-y-1">
              <h2 className="font-bold text-4xl text-white tracking-[0.3em]">VPPA</h2>
              <p className="text-sm text-white/60 tracking-[0.2em]">FASHIONS</p>
            </div>
            <div className="space-y-2">
              <h1 className="font-light text-4xl text-white">Welcome Back</h1>
              <p className="text-lg text-white/70">Admin Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-bold text-2xl tracking-[0.2em] lg:hidden">VPPA FASHIONS</div>
            <div className="font-medium tracking-tight">Login to your account</div>
            <div className="mx-auto max-w-xl text-muted-foreground">
              Enter your credentials to access the admin dashboard.
            </div>
          </div>
          <div className="space-y-4">
            <LoginForm />
            <p className="text-center text-muted-foreground text-xs">
              Don&apos;t have an account?{" "}
              <Link prefetch={false} href="register" className="text-primary">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
