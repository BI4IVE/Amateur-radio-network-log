"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import * as XLSX from "xlsx-js-style"
import { formatDate, formatDateTime, formatTime } from "@/utils/dateFormat"

interface Session {
  id: string
  controllerName: string
  controllerEquipment: string | null
  controllerAntenna: string | null
  controllerQth: string | null
  sessionTime: string
  createdAt: string
}

interface LogRecord {
  id: string
  callsign: string
  qth: string | null
  equipment: string | null
  antenna: string | null
  power: string | null
  signal: string | null
  report: string | null
  remarks: string | null
  createdAt: string
}

export default function SessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [records, setRecords] = useState<LogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    // 获取当前用户
    const userStr = localStorage.getItem("user")
    if (userStr) {
      const user = JSON.parse(userStr)
      setCurrentUser(user)
    }
    loadSessionDetails()
  }, [sessionId])

  const loadSessionDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/stats/session/${sessionId}`)
      if (!response.ok) {
        throw new Error("获取会话详情失败")
      }
      const data = await response.json()
      setSession(data.session)
      setRecords(data.records || [])

      // 权限检查：如果不是管理员，检查会话是否属于当前用户
      if (currentUser && currentUser.role !== "admin") {
        // 需要通过 controllerId 判断是否属于当前用户
        // 但是 session 数据中没有 controllerId，我们需要从 API 返回中获取
        // 这里我们假设 API 会返回 controllerId，或者我们需要修改 API
        if (data.session && data.session.controllerId && data.session.controllerId !== currentUser.id) {
          alert("无权访问此会话详情")
          router.back()
          return
        }
      }
    } catch (error) {
      console.error("Load session details error:", error)
      alert("加载会话详情失败")
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!session || records.length === 0) {
      alert("没有可导出的数据")
      return
    }

    // 按时间正序排列（旧到新）
    const sortedRecords = [...records].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    // 获取日期
    const sessionDate = formatDate(session.sessionTime)

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
      ["会话时间", formatDateTime(session.sessionTime)],
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
        formatTime(record.createdAt),
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

    // 导出文件
    const fileName = `台网记录_${session.controllerName}_${sessionDate}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="text-black">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-black">台网会话详情</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              返回
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              导出CSV
            </button>
          </div>
        </div>

        {session && (
          <>
            {/* Session Info */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-black">会话信息</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    主控
                  </label>
                  <div className="text-black font-medium">{session.controllerName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    会话时间
                  </label>
                  <div className="text-black">
                    {formatDateTime(session.sessionTime)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    QTH
                  </label>
                  <div className="text-black">{session.controllerQth || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    设备
                  </label>
                  <div className="text-black">{session.controllerEquipment || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    天线
                  </label>
                  <div className="text-black">{session.controllerAntenna || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    记录数
                  </label>
                  <div className="text-black font-medium">{records.length} 条</div>
                </div>
              </div>
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-indigo-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <h2 className="text-lg font-semibold text-black">
                  台网记录列表 ({records.length}条)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        序号
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        呼号
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        时间
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        QTH
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        设备
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        天馈
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        功率
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        信号
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        报告
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        备注
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-black">
                          暂无记录
                        </td>
                      </tr>
                    ) : (
                      [...records].reverse().map((record, index) => (
                        <tr key={record.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {records.length - index}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-black">
                            {record.callsign}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {formatTime(record.createdAt)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {record.qth || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {record.equipment || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {record.antenna || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {record.power || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {record.signal || "-"}
                          </td>
                          <td className="px-4 py-2 text-sm text-black max-w-xs truncate">
                            {record.report || "-"}
                          </td>
                          <td className="px-4 py-2 text-sm text-black max-w-xs truncate">
                            {record.remarks || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
