// @version v1.5.19
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import * as XLSX from "xlsx-js-style"
import { formatDate, formatDateTime, formatTime } from "@/utils/dateFormat"
import { getAuthUser, requireLogin } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // 验证登录状态
    const user = await getAuthUser(request)
    const loginError = requireLogin(user)
    if (loginError.error) {
      return NextResponse.json({ error: loginError.error }, { status: 401 })
    }

    const { session, records } = await logManager.getSessionWithRecords(sessionId)

    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    // 按时间正序排列（旧到新）
    const sortedRecords = [...records].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    // 获取日期（北京时间）
    const sessionDate = formatDate(session.sessionTime.toISOString())

    // 创建工作簿
    const workbook = XLSX.utils.book_new()

    // 创建数据数组（包含标题和信息）
    const data = [
      // 标题
      ["济南黄河业余无线电中继台"],
      [`${sessionDate}台网`],
      [""],
      ["当日数据情况"],
      [""],
      ["主控", session.controllerName],
      ["会话时间", formatDateTime(session.sessionTime.toISOString())],
      ["QTH", session.controllerQth || "-"],
      ["设备", session.controllerEquipment || "-"],
      ["天线", session.controllerAntenna || "-"],
      ["记录总数", `${records.length}条`],
      [""],
      [""],
      // 表头
      ["序号", "呼号", "QTH", "设备", "天馈", "功率", "信号", "报告", "备注", "时间"],
      // 数据行
      ...sortedRecords.map((record, index) => [
        index + 1,
        record.callsign,
        record.qth || "",
        record.equipment || "",
        record.antenna || "",
        record.power || "",
        record.signal || "",
        record.report || "",
        record.remarks || "",
        record.createdAt ? formatTime(record.createdAt.toISOString()) : "",
      ]),
    ]

    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(data)

    // 设置列宽
    worksheet["!cols"] = [
      { wch: 6 },   // 序号
      { wch: 12 },  // 呼号
      { wch: 20 },  // QTH
      { wch: 15 },  // 设备
      { wch: 15 },  // 天馈
      { wch: 10 },  // 功率
      { wch: 10 },  // 信号
      { wch: 15 },  // 报告
      { wch: 20 },  // 备注
      { wch: 10 },  // 时间
    ]

    // 设置样式
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1")
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        if (!worksheet[cellAddress]) continue

        // 标题行样式（第1-2行）
        if (R < 2) {
          worksheet[cellAddress].s = {
            font: { bold: true, sz: 16, color: { rgb: "1E40AF" } },
            alignment: { horizontal: "center", vertical: "center" },
          }
        }
        // 信息行样式（第4-11行）
        else if (R >= 3 && R <= 10) {
          worksheet[cellAddress].s = {
            font: { sz: 11 },
            alignment: { vertical: "center" },
          }
          // 标签列加粗
          if (C === 0) {
            worksheet[cellAddress].s.font = { bold: true, sz: 11 }
          }
        }
        // 表头样式（data 数组表头位于索引 13，即第 14 行）
        else if (R === 13) {
          worksheet[cellAddress].s = {
            font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "3B82F6" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
          }
        }
        // 数据行样式（第14行及以后）
        else {
          worksheet[cellAddress].s = {
            font: { sz: 10 },
            alignment: { vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "CCCCCC" } },
              bottom: { style: "thin", color: { rgb: "CCCCCC" } },
              left: { style: "thin", color: { rgb: "CCCCCC" } },
              right: { style: "thin", color: { rgb: "CCCCCC" } },
            },
          }
          // 序号列居中
          if (C === 0) {
            worksheet[cellAddress].s.alignment = { horizontal: "center", vertical: "center" }
          }
          // 时间列居中
          if (C === 9) {
            worksheet[cellAddress].s.alignment = { horizontal: "center", vertical: "center" }
          }
        }
      }
    }

    // 合并标题单元格
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // 标题行
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // 副标题行
    ]

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, "台网记录")

    // 生成Excel文件
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })

    // 设置响应头
    const filename = `${sessionDate}台网记录.xlsx`
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
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
