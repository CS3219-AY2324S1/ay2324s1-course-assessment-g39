type ModalProps = { showModal: boolean; msg: string };
const WarningModal = ({ showModal, msg }: ModalProps) => {
  return (
    <>
      {showModal && (
        <>
          <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
            <div className="relative w-full max-w-md mx-auto">
              <div className="relative flex flex-col w-full bg-slate-900 text-slate-200 shadow-md rounded-md">
                <div
                  className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4"
                  role="alert"
                >
                  <p className="font-bold">Error</p>
                  <p>{msg}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="opacity-70 fixed inset-0 z-40 bg-black"></div>
        </>
      )}
    </>
  );
};

export default WarningModal;
