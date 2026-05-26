import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl text-earth">friendkeeper</h1>
          <p className="mt-2 text-sm text-clay">track the people you care about</p>
        </div>
        <SignUp />
      </div>
    </div>
  );
}
