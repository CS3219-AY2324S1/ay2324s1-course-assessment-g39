import { signIn } from "next-auth/react";

export default function UserDenied() {
  return (<div className="items-center">
  <h1>User Denied</h1>
  <button onClick={() =>  void signIn()}>Sign In</button>
  </div>)
}

