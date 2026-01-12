"use client";

export default function ScheduleSummaryView() {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        <tr className="border-b">
          <td className="py-3 text-neutral-500">
            Total Duration
          </td>
          <td className="py-3 text-right font-medium">
            —
          </td>
        </tr>

        <tr className="border-b">
          <td className="py-3 text-neutral-500">
            Total Activities
          </td>
          <td className="py-3 text-right font-medium">
            —
          </td>
        </tr>

        <tr className="border-b">
          <td className="py-3 text-neutral-500">
            Calendar Type
          </td>
          <td className="py-3 text-right font-medium">
            —
          </td>
        </tr>

        <tr>
          <td className="py-3 text-neutral-500">
            Critical Path
          </td>
          <td className="py-3 text-right font-medium">
            —
          </td>
        </tr>
      </tbody>
    </table>
  );
}
