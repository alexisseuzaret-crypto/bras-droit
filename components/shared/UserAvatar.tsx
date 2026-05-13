import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/lib/supabase/database.types'

interface UserAvatarProps {
  profile: Pick<Profile, 'full_name' | 'avatar_color'>
  size?: 'sm' | 'md'
  showTooltip?: boolean
}

export function UserAvatar({ profile, size = 'sm', showTooltip = false }: UserAvatarProps) {
  const avatar = (
    <Avatar className={size === 'sm' ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-sm'}>
      <AvatarFallback style={{ backgroundColor: profile.avatar_color }} className="text-white font-medium">
        {getInitials(profile.full_name)}
      </AvatarFallback>
    </Avatar>
  )
  if (!showTooltip) return avatar
  return (
    <Tooltip>
      <TooltipTrigger>{avatar}</TooltipTrigger>
      <TooltipContent>{profile.full_name}</TooltipContent>
    </Tooltip>
  )
}
