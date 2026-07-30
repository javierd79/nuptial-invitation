'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    plus_ones: 0,
    gift_description: '',
    is_godparent: false,
  })
  const [guests, setGuests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const supabase = createClient()
      const { data, error } = await supabase
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
        .select()

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage(`Guest added successfully! UUID: ${data?.[0]?.id}`)
        setFormData({
          full_name: '',
          email: '',
          plus_ones: 0,
          gift_description: '',
          is_godparent: false,
        })
        loadGuests()
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadGuests = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('guests').select('*')

      if (error) {
        setMessage(`Error loading guests: ${error.message}`)
      } else {
        setGuests(data || [])
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-serif font-light mb-8">Wedding Admin Panel</h1>

        {/* Add Guest Form */}
        <div className="max-w-2xl mb-12 bg-gray-50 p-8 rounded-lg">
          <h2 className="text-2xl font-serif font-light mb-6">Add New Guest</h2>
          <form onSubmit={handleAddGuest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plus Ones</label>
              <input
                type="number"
                name="plus_ones"
                value={formData.plus_ones}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gift Description</label>
              <textarea
                name="gift_description"
                value={formData.gift_description}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              ></textarea>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_godparent"
                checked={formData.is_godparent}
                onChange={handleInputChange}
                className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
              />
              <label className="ml-2 block text-sm font-medium text-gray-700">Is Godparent</label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
            >
              {loading ? 'Adding...' : 'Add Guest'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-4 rounded-lg ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </div>
          )}
        </div>

        {/* Guests List */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-light">Guests List</h2>
            <button
              onClick={loadGuests}
              className="px-6 py-2 border border-gray-900 text-gray-900 rounded-lg hover:bg-gray-900 hover:text-white transition-all duration-300"
            >
              Load Guests
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">UUID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Plus Ones</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Godparent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Attending</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((guest) => (
                  <tr key={guest.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{guest.full_name}</td>
                    <td className="py-3 px-4 text-sm">{guest.email}</td>
                    <td className="py-3 px-4 text-xs font-mono text-gray-600">
                      {guest.id.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-sm">{guest.plus_ones}</td>
                    <td className="py-3 px-4 text-sm">{guest.is_godparent ? 'Yes' : 'No'}</td>
                    <td className="py-3 px-4 text-sm">
                      {guest.is_attending === null ? '-' : guest.is_attending ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {guests.length === 0 && (
            <p className="text-center py-8 text-gray-600">No guests found. Click "Load Guests" to load them.</p>
          )}
        </div>

        {/* Guest Links */}
        <div className="mt-12 bg-blue-50 p-8 rounded-lg">
          <h3 className="text-xl font-serif font-light mb-4">Guest Links</h3>
          <p className="text-sm text-gray-600 mb-6">
            Share these links with your guests. Replace UUID with the guest&apos;s ID from the table above:
          </p>
          <div className="font-mono text-sm bg-white p-4 rounded border border-blue-200">
            http://localhost:3000/?guest={'<UUID>'}
          </div>
          <p className="text-xs text-gray-600 mt-4">
            Example: http://localhost:3000/?guest=550e8400-e29b-41d4-a716-446655440000
          </p>
        </div>
      </div>
    </div>
  )
}
