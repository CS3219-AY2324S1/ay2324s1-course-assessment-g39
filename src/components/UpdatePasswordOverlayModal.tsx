import React from "react";
import { z } from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const password_z = z.string().min(6);
const updatePasswordSchema_z = z.object({
  password: password_z,
});

type UpdatePasswordSchemaData = z.infer<typeof updatePasswordSchema_z>;
type UpdatePasswordModalProps = {
  onUpdate: (data: UpdatePasswordSchemaData) => void;
  showModal: boolean;
  closeModal: () => void;
};
const UpdatePasswordModal = ({
  onUpdate,
  showModal,
  closeModal,
}: UpdatePasswordModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordSchemaData>({
    resolver: zodResolver(updatePasswordSchema_z),
  });

  const onSubmit: SubmitHandler<UpdatePasswordSchemaData> = (data) => {
    onUpdate(data);
  };

  return (
    <>
      {showModal && (
        <>
          <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none rounded-md">
            <div className="relative lg:w-1/3">
              <div className="p-6 border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-slate-900 text-slate-100  outline-none focus:outline-none space-y-6">
                <button
                  className="text-slate-300 absolute top-1 right-1 rounded-full font-bold p-2 text-sm outline-none focus:outline-none"
                  type="button"
                  onClick={() => closeModal()}
                >
                  x
                </button>
                <h3>Change Password</h3>
                <div className="relative flex-auto">
                  <form
                    className="flex flex-col items-stretch space-y-4 md:space-y-6"
                    onSubmit={(e) => void handleSubmit(onSubmit)(e)}
                  >
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Password
                      </label>
                      <input
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        type="password"
                        placeholder="••••••••"
                        {...register("password")}
                      />
                      {errors.password && (
                        <span className="text-sm lowercase text-red-300">
                          {errors.password.message}
                        </span>
                      )}
                    </div>
                    <div className="items-center py-1">
                      <input
                        className="w-full text-slate-200 bg-slate-700 hover:bg-slate-900 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-slate-500 dark:hover:bg-slate-600 dark:focus:ring-primary-800"
                        type="submit"
                        value="Update Password"
                      />
                    </div>
                  </form>
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

export default UpdatePasswordModal;
