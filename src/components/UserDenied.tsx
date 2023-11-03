import { PageLayout } from "./Layout";
import { LoadingPage } from "./Loading";

// todo fix this component -> shouldn't be loading
export default function UserDenied() {
  return (
    <PageLayout>
      <LoadingPage />
    </PageLayout>
  )
}

