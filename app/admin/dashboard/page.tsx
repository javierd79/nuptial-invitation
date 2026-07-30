'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Plus, Copy, Check } from 'lucide-react'

interface Guest {
  id: string
  full_name: string
  email: string
  plus_ones: number
  gift_description: string | null
  is_godparent: boolean
  is_attending: boolean | null
  created_at: string
}

interface Metrics {
  total_guests: number
  total_plus_ones: number
  confirmed: number
  declined: number
  pending: number
  godparents: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [guests, setGuests] = useState<Guest[]>([])
  const [metrics, setMetrics] = useState<Metrics>({
    total_guests: 0,
    total_plus_ones: 0,
    confirmed: 0,
    declined: 0,
    pending: 0,
    godparents: 0,
  })
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    plus_ones: 0,
    gift_description: '',
    is_godparent: false,
  })
  const [message, setMessage] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/admin/login')
        return
      }

      loadGuests()
    }

    checkAuth()
  }, [router])

  const loadGuests = async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading guests:', error)
        return
      }

      setGuests(data || [])
      calculateMetrics(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = (guestList: Guest[]) => {
    const newMetrics: Metrics = {
      total_guests: guestList.length,
      total_plus_ones: guestList.reduce((sum, g) => sum + g.plus_ones, 0),
      confirmed: guestList.filter(g => g.is_attending === true).length,
      declined: guestList.filter(g => g.is_attending === false).length,
      pending: guestList.filter(g => g.is_attending === null).length,
      godparents: guestList.filter(g => g.is_godparent).length,
    }
    setMetrics(newMetrics)
  }

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('guests')
        .insert([
          {
            full_name: formData.full_name,
            email: formData.email,
            plus_ones: parseInt(formData.plus_ones.toString()) || 0,
            gift_description: formData.gift_description || null,
            is_godparent: formData.is_godparent,
          },
        ])

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Guest added successfully!')
        setFormData({
          full_name: '',
          email: '',
          plus_ones: 0,
          gift_description: '',
          is_godparent: false,
        })
        loadGuests()
      }
    } catch (error) {
      setMessage('Error adding guest')
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const copyToClipboard = (id: string) => {
    const url = `${window.location.origin}/?guest=${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-serif font-light text-gray-900">
              Wedding Dashboard
            </h1>
            <p className="text-sm text-gray-500 tracking-widest uppercase mt-2">
              Manage Guests & RSVPs
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          <div className="border border-gray-200 p-6 rounded-sm">
            <p className="text-xs tracking-widest text-gray-500 uppercase mb-2">Total Guests</p>
            <p className="text-3xl font-serif font-light text-gray-900">{metrics.total_guests}</p>
          </div>
          <div className="border border-gray-200 p-6 rounded-sm">
            <p className="text-xs tracking-widest text-gray-500 uppercase mb-2">Plus Ones</p>
            <p className="text-3xl font-serif font-light text-gray-900">{metrics.total_plus_ones}</p>
          </div>
          <div className="border border-gray-200 p-6 rounded-sm bg-green-50">
            <p className="text-xs tracking-widest text-green-700 uppercase mb-2">Confirmed</p>
            <p className="text-3xl font-serif font-light text-green-900">{metrics.confirmed}</p>
          </div>
          <div className="border border-gray-200 p-6 rounded-sm bg-red-50">
            <p className="text-xs tracking-widest text-red-700 uppercase mb-2">Declined</p>
            <p className="text-3xl font-serif font-light text-red-900">{metrics.declined}</p>
          </div>
          <div className="border border-gray-200 p-6 rounded-sm bg-yellow-50">
            <p className="text-xs tracking-widest text-yellow-700 uppercase mb-2">Pending</p>
            <p className="text-3xl font-serif font-light text-yellow-900">{metrics.pending}</p>
          </div>
          <div className="border border-gray-200 p-6 rounded-sm">
            <p className="text-xs tracking-widest text-gray-500 uppercase mb-2">Godparents</p>
            <p className="text-3xl font-serif font-light text-gray-900">{metrics.godparents}</p>
          </div>
        </div>

        {/* Add Guest Form */}
        <div className="border border-gray-200 p-8 mb-12 rounded-sm">
          <h2 className="text-2xl font-serif font-light text-gray-900 mb-8">Add New Guest</h2>
          
          <form onSubmit={handleAddGuest} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs tracking-widest text-gray-600 uppercase mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-sm focus:outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest text-gray-600 uppercase mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-sm focus:outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest text-gray-600 uppercase mb-2">
                  Plus Ones
                </label>
                <input
                  type="number"
                  name="plus_ones"
                  min="0"
                  value={formData.plus_ones}
                  onChange={(e) => setFormData({ ...formData, plus_ones: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-sm focus:outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs tracking-widest text-gray-600 uppercase mt-8">
                  <input
                    type="checkbox"
                    name="is_godparent"
                    checked={formData.is_godparent}
                    onChange={(e) => setFormData({ ...formData, is_godparent: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Is Godparent
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs tracking-widest text-gray-600 uppercase mb-2">
                Gift Description
              </label>
              <textarea
                name="gift_description"
                value={formData.gift_description}
                onChange={(e) => setFormData({ ...formData, gift_description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-sm focus:outline-none focus:border-gray-900"
              />
            </div>

            {message && (
              <div className={`p-4 rounded-sm ${
                message.includes('Error') 
                  ? 'bg-red-50 border border-red-200 text-red-700' 
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}>
                <p className="text-sm">{message}</p>
              </div>
            )}

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-serif hover:bg-gray-800 transition-colors rounded-sm"
            >
              <Plus className="w-4 h-4" />
              Add Guest
            </button>
          </form>
        </div>

        {/* Guests Table */}
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <div className="p-8 border-b border-gray-200">
            <h2 className="text-2xl font-serif font-light text-gray-900">All Guests</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading guests...</div>
          ) : guests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No guests added yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs tracking-widest text-gray-600 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs tracking-widest text-gray-600 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs tracking-widest text-gray-600 uppercase">+1</th>
                    <th className="px-6 py-3 text-left text-xs tracking-widest text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs tracking-widest text-gray-600 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs tracking-widest text-gray-600 uppercase">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((guest) => (
                    <tr key={guest.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{guest.full_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{guest.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{guest.plus_ones}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          guest.is_attending === true
                            ? 'bg-green-100 text-green-800'
                            : guest.is_attending === false
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {guest.is_attending === true
                            ? 'Confirmed'
                            : guest.is_attending === false
                            ? 'Declined'
                            : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {guest.is_godparent && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                            Godparent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => copyToClipboard(guest.id)}
                          className="flex items-center gap-2 px-3 py-1 border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors rounded-sm text-xs"
                        >
                          {copiedId === guest.id ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
