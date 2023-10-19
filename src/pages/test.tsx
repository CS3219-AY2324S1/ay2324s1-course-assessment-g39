import { WithAuthWrapper } from "~/components/wrapper/AuthWrapper";
import useMatching from "~/hooks/useMatching";


const APp = () => {
    useMatching((data) => console.log(data));
    return <>Hello world</>
};


export default WithAuthWrapper(APp);
