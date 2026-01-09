import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import * as XLSX from "xlsx"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const { session, records } = await logManager.getSessionWithRecords(sessionId)

    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    // Prepare data for Excel export
    const data = records.map((record) => ({
      呼号: record.callsign,
      QTH: record.qth || "",
      设备: record.equipment || "",
      天馈: record.antenna || "",
      功率: record.power || "",
      信号: record.signal || "",
      报告: record.report || "",
      备注: record.remarks || "",
    }))

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // Add session info sheet
    const sessionData = [
      ["会话ID", session.id],
      ["主控人员", session.controllerName],
      ["主控设备", session.controllerEquipment || ""],
      ["主控天线", session.controllerAntenna || ""],
      ["主控QTH", session.controllerQth || ""],
      ["台网时间", session.sessionTime],
      ["创建时间", session.createdAt],
    ]
    const sessionSheet = XLSX.utils.aoa_to_sheet(sessionData)
    XLSX.utils.book_append_sheet(workbook, sessionSheet, "会话信息")

    // Add records sheet
    const recordsSheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, recordsSheet, "台网记录")

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    // Return file
    const filename = `台网日志_${session.controllerName}_${new Date(session.sessionTime).toISOString().split("T")[0]}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json(
      { error: "导出失败" },
      { status: 500 }
    )
  }
}
