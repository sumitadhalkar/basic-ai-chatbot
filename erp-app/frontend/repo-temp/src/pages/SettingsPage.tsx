import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { Lock, User, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PageHeader, Field, Spinner } from '@/components/ui'

type PasswordForm = {
  current_password: string
  new_password: string
  confirm_password: string
}

export default function SettingsPage() {
  const user = useAuthStore(s => s.user)
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PasswordForm>()

  const passwordMutation = useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) =>
      api.post('/auth/change-password', body),
    onSuccess: () => {
      toast.success('Password changed successfully')
      reset()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to change password'),
  })

  const newPassword = watch('new_password')

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Profile Information</h2>
              <p className="text-sm text-gray-500">Your account details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Full Name</span>
              <span className="text-sm font-medium text-gray-900">{user?.full_name}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-medium text-gray-900">{user?.email}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Role</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{user?.role}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm text-gray-500">Account Type</span>
              <span className="text-sm font-medium text-gray-900">
                {user?.is_superuser ? 'Superuser' : 'Standard User'}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-500">Update your login password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(d => passwordMutation.mutate({
            current_password: d.current_password,
            new_password: d.new_password,
          }))} className="space-y-4">
            <Field label="Current Password" required error={errors.current_password?.message}>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                {...register('current_password', { required: 'Required' })}
              />
            </Field>
            <Field label="New Password" required error={errors.new_password?.message}>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                {...register('new_password', {
                  required: 'Required',
                  minLength: { value: 8, message: 'Minimum 8 characters' },
                })}
              />
            </Field>
            <Field label="Confirm New Password" required error={errors.confirm_password?.message}>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                {...register('confirm_password', {
                  required: 'Required',
                  validate: val => val === newPassword || 'Passwords do not match',
                })}
              />
            </Field>
            <button type="submit" className="btn-primary w-full" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? <Spinner className="h-4 w-4 text-white" /> : 'Update Password'}
            </button>
          </form>
        </div>

        {/* System Info */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
              <Info size={20} />
            </div>
            <h2 className="text-base font-semibold text-gray-900">System Information</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Platform', value: 'ERP Platform' },
              { label: 'Version', value: '1.0.0' },
              { label: 'Stack', value: 'FastAPI + React' },
              { label: 'Database', value: 'PostgreSQL 15' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs">{label}</p>
                <p className="font-medium text-gray-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
