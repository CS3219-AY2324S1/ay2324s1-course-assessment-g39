import { PageLayout } from "./Layout";
import { LoadingPage } from "./Loading";

// todo fix this component -> shouldn't be loading
export default function UserDenied() {
  return (
    <PageLayout>
      <div className="flex flex-col items-center justify-center">
        <h1>
      User Unauthorised
      </h1>
      </div>
    </PageLayout>
  )
}

