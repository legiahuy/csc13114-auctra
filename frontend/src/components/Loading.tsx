import { LoaderIcon } from "lucide-react";

const Loading = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoaderIcon
        className="animate-spin size-5 mx-auto"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
};

export default Loading;
