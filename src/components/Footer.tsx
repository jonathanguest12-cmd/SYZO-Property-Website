export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-6 text-sm text-gray-500 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <p>&copy; 2026 SYZO Ltd</p>
        <div className="flex gap-4">
          <span className="cursor-default hover:text-gray-700">Privacy Policy</span>
          <span className="cursor-default hover:text-gray-700">How we use your data</span>
        </div>
      </div>
    </footer>
  )
}
