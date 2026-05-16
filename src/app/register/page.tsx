import { isConfigured } from "@/lib/env";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  if (!isConfigured()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-semibold">환경 변수가 설정되지 않았습니다</h1>
        <p className="mt-4 text-neutral-400">
          `.env.local.example` 을 참고하여 Supabase URL/Key 를 설정해주세요.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold">질문 등록</h1>
        <p className="mt-2 text-sm text-neutral-400">
          이름과 질문을 남기면 대기열에 자동으로 추가됩니다.
        </p>
        <RegisterForm />
      </div>
    </main>
  );
}
