import Link from "next/link";

export default function Home() {
  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-[#2f2f2f] text-white">
        <Link href={"/collab"}>Practice with others</Link>
      </div>
    </>
  );
}
