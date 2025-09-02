"use client";

import Link from "next/link";

const ErrorPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-black text-center p-4">
      <h1 className="text-8xl font-black text-gray-400 dark:text-gray-700">
        :(
      </h1>

      <p className="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
        Oops! Something went wrong.
      </p>

      <p className="mt-2 text-md text-gray-500 dark:text-gray-400">
        An unexpected error occurred. Please try again or return home.
      </p>

      <div className="mt-8 flex gap-4">
        {/* Reloads the page */}
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 font-medium text-white bg-black dark:bg-white dark:text-black rounded-md hover:opacity-90 transition-opacity"
        >
          Try Reloading
        </button>

        <Link
          href="/"
          className="px-5 py-2 font-medium text-gray-700 bg-gray-200 dark:text-gray-200 dark:bg-gray-800 rounded-md hover:opacity-90 transition-opacity"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default ErrorPage;
