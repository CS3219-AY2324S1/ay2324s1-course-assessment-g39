import LoadingIcon from "./LoadingIcon";


type SubmissionProps = {
    passed: number,
    complete: boolean,
    status?: string,
    numOfTests: number,
};

// ratio is the ratio of postive to negative
const RatioBar = ({ ratio }: { ratio: number }) => (<div className="bg-gray-200 w-1/2 rounded-full h-2.5 dark:bg-gray-700">
<div className="bg-green-600 h-2.5 rounded-full" style={{
    width: `${ratio * 100}%`
}}></div>
</div>);

/**
 * Displays information about a submission
 */
const Submission = (props: SubmissionProps) => {
    return <div className="h-full w-full m-3 flex flex-col justify-center items-center">
        Number passed: {props.passed}
        <br />
        Number of tests: {props.numOfTests}
        <RatioBar ratio={props.passed / props.numOfTests} />
        {!props.complete && <div className="p-3"><LoadingIcon /></div>}
        {props.complete && <div className="p-3">Status: {props.status}</div>}
    </div>
};

export default Submission;



