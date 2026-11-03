'use client'

// The three charts, kept out of the dashboard page itself.
//
// recharts is 106 KB over the wire -- half of everything the panel downloads
// to open -- and it is needed for three boxes below the figures. Importing it
// here means the page can arrive, paint its numbers and its recent bookings
// without it, and the charts fill in a moment later. The page loads these
// with next/dynamic; nothing else should import this file eagerly.

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatMoneyExact, formatMoneyAxis } from '../../lib/currency'

const fmtCurrency = formatMoneyExact

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'revenue' ? fmtCurrency(p.value) : `${p.value} bookings`}
        </p>
      ))}
    </div>
  )
}

export function RevenueChart({ data }: { data: { month: string; revenue: number; bookings: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="bkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="rev" orientation="left" tickFormatter={formatMoneyAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
        <YAxis yAxisId="bk" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
        <Area yAxisId="rev" type="monotone" dataKey="revenue" name="revenue" stroke="#f97316" strokeWidth={2} fill="url(#revGrad)" dot={false} />
        <Area yAxisId="bk" type="monotone" dataKey="bookings" name="bookings" stroke="#3b82f6" strokeWidth={2} fill="url(#bkGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function StatusPie({ data }: { data: { name: string; value: number; color: string }[] }) {
  const shown = data.filter(s => s.value > 0)
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={shown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
          {shown.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v: any) => [v, '']} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function HotelBars({ data }: { data: { hotel: string; bookings: number; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="hotel"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + '…' : v}
        />
        <YAxis tickFormatter={formatMoneyAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
        <Tooltip
          formatter={(v: any, name: string) => [name === 'revenue' ? fmtCurrency(v) : v, name === 'revenue' ? 'Revenue' : 'Bookings']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
        <Bar dataKey="revenue" name="Revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
        <Bar dataKey="bookings" name="Bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
