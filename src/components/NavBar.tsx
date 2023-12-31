import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";

const NavBar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => setIsDropdownOpen(false);

  const { data: session } = useSession(); 

  return (
    <div className="relative bg-slate-800 py-3">
      <div className="">
        <button
          onClick={toggleDropdown}
          className="text-white hover:text-gray-300 px-3"
        >
          Menu
        </button>
      </div>
      {isDropdownOpen && (
        <div className="absolute z-50 bg-slate-800 flex flex-col space-y-1 p-2">
          <Link
            href="/"
            onClick={closeDropdown}
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-4"
          >
            PeerPrep
          </Link>
          <Link
            href="/questions"
            onClick={closeDropdown}
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-4"
          >
            AlgoQuestions
          </Link>
          <Link
            href="/profile/account"
            onClick={closeDropdown}
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-4"
          >
            Profile
          </Link>
          <Link
            href="/collab"
            onClick={closeDropdown}
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-4"
          >
            Collab
          </Link>
          <Link
            href="/codespace"
            onClick={closeDropdown}
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-4"
          >
            CodeSpace
          </Link>
          <Link
            href="/judge"
            onClick={closeDropdown}
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-4"
          >
            CodeExecution - Judge0
          </Link>
          {!session && <Link
            href="/sign-up"
            onClick={closeDropdown}
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-4"
          >
            SignUp
          </Link>}
          {!session && <Link
            href="/sign-in"
            onClick={closeDropdown}
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-4"
          >
            SignIn
          </Link>}
          {
            session?.user.role === "MAINTAINER" && 
            <Link
            href="/maintainer/testcases"
            onClick={closeDropdown}
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-4"
          >
            Test cases
          </Link>
          }
          {
            session?.user.role === "MAINTAINER" && 
            <Link
            href="/maintainer/environments"
            onClick={closeDropdown}
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-4"
          >
            Environments
          </Link>
          }
          {session && <div
            onClick={() => {
              void signOut();
            }}
            className="cursor-pointer flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-4"
          >
            Log out
          </div>}
        </div>
      )}
    </div>
  );
};

export default NavBar;
