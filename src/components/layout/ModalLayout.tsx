import { useEffect, useState } from "react";
import { StyledButton } from "../StyledButton";

const ModalLayout = ({
  children,
  buttonStyling,
  buttonText,
  modalValue,
  onModalChange
}: {
  children: JSX.Element;
  buttonStyling: string;
  buttonText: JSX.Element | string;
  modalValue?: boolean;
  onModalChange?: (val: boolean) => void;
}) => {
  const [modalOpen, setModalOpenInner] = useState(false);
  useEffect(() => {
    modalValue !== undefined && setModalOpenInner(modalValue);
  }, [modalValue]);
  function setModalOpen(val: boolean) {
    setModalOpenInner(val);
    onModalChange && onModalChange(val);
  }
  
  return (
    <>
      <div className={buttonStyling}>
        <StyledButton
          onClick={(e) => {
            e.preventDefault();
            setModalOpen(true);
          }}
        >
          {buttonText}
        </StyledButton>
        {modalOpen && (
          <>
            <div className="fixed bg-slate-600 z-50 rounded">
              {children}
              <div className="top-2 right-2 absolute">
                <StyledButton
                  onClick={(e) => {
                    e.preventDefault();
                    setModalOpen(false);
                  }}
                >
                  Close
                </StyledButton>
              </div>
            </div>
            <div
              className="opacity-70 fixed inset-0 h-full w-full z-40 bg-black"
              onClick={(e) => {
                e.preventDefault();
                setModalOpen(false);
              }}
            />
          </>
        )}
      </div>
    </>
  );
};

export default ModalLayout;
