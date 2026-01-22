import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import * as XLSX from "xlsx-js-style"
import { formatDate, formatDateTime, formatTime } from "@/utils/dateFormat"

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

    // 合并标题单元格
    if (!worksheet["!merges"]) {
      worksheet["!merges"] = []
    }
    worksheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }) // 标题行
    worksheet["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }) // 日期行
    worksheet["!merges"].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 9 } }) // 小标题行

    // 设置单元格样式 - 主标题：大字体、加粗、居中
    if (worksheet["A1"]) {
      worksheet["A1"].s = {
        font: {
          bold: true,
          sz: 36,
          name: "SimHei",
          color: { rgb: "1F4E78" }
        },
        alignment: {
          horizontal: "center",
          vertical: "center"
        }
      }
    }

    // 副标题：中等字体、加粗、居中
    if (worksheet["A2"]) {
      worksheet["A2"].s = {
        font: {
          bold: true,
          sz: 14,
          name: "SimHei",
          color: { rgb: "1F4E78" }
        },
        alignment: {
          horizontal: "center",
          vertical: "center"
        }
      }
    }

    // 小标题：加粗、居中
    if (worksheet["A4"]) {
      worksheet["A4"].s = {
        font: {
          bold: true,
          sz: 12,
          name: "SimHei",
          color: { rgb: "44546A" }
        },
        alignment: {
          horizontal: "center",
          vertical: "center"
        }
      }
    }

    // 信息标签：加粗、居中
    const infoLabels = ["主控", "会话时间", "QTH", "设备", "天线", "记录总数"]
    infoLabels.forEach((label, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: index + 5, c: 0 })
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          font: {
            bold: true,
            name: "SimHei"
          },
          alignment: {
            horizontal: "center",
            vertical: "center"
          }
        }
      }
    })

    // 信息值：居中
    infoLabels.forEach((label, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: index + 5, c: 1 })
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          alignment: {
            horizontal: "center",
            vertical: "center"
          }
        }
      }
    })

    // 表头：加粗、背景色、居中
    const headerRowIndex = 13
    for (let col = 0; col < 10; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: col })
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          font: {
            bold: true,
            color: { rgb: "FFFFFF" },
            name: "SimHei"
          },
          fill: {
            fgColor: { rgb: "4472C4" }
          },
          alignment: {
            horizontal: "center",
            vertical: "center"
          }
        }
      }
    }

    // 数据单元格：居中
    for (let row = headerRowIndex + 1; row < data.length; row++) {
      for (let col = 0; col < 10; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = {
            alignment: {
              horizontal: "center",
              vertical: "center"
            },
            font: {
              name: "SimHei"
            }
          }
        }
      }
    }

    // 设置行高
    if (!worksheet["!rows"]) {
      worksheet["!rows"] = []
    }
    worksheet["!rows"][0] = { hpt: 50 }  // 标题行高
    worksheet["!rows"][1] = { hpt: 40 }  // 副标题行高
    worksheet["!rows"][3] = { hpt: 35 }  // 小标题行高
    worksheet["!rows"][13] = { hpt: 30 } // 表头行高

    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, "台网记录")

    // 生成 buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    // 返回文件
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
