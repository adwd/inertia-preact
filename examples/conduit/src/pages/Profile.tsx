import { Head, Link, usePage } from '@adwd/inertia-preact'
import { FollowButton } from '../components/actions.tsx'
import ArticleList from '../components/ArticleList.tsx'
import { avatar, profileUrl } from '../format.ts'
import type { ArticlePreview, Paginated, Profile as ProfileData } from '../types.ts'

interface Props {
  profile: ProfileData
  tab: 'articles' | 'favorites'
  articles: Paginated<ArticlePreview>
  isSelf: boolean
}

export default function Profile({ profile, tab, articles, isSelf }: Props) {
  const { url } = usePage()
  const base = profileUrl(profile.username)

  return (
    <div class="profile-page">
      <Head title={profile.username} />

      <div class="user-info">
        <div class="container">
          <div class="row">
            <div class="col-xs-12 col-md-10 offset-md-1">
              <img src={avatar(profile.image)} class="user-img" alt="" />
              <h4>{profile.username}</h4>
              {profile.bio && <p>{profile.bio}</p>}
              {isSelf ? (
                <Link href="/settings" class="btn btn-sm btn-outline-secondary action-btn">
                  <i class="ion-gear-a" />
                  &nbsp; Edit Profile Settings
                </Link>
              ) : (
                <FollowButton profile={profile} class="action-btn" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="row">
          <div class="col-xs-12 col-md-10 offset-md-1">
            <div class="articles-toggle">
              <ul class="nav nav-pills outline-active">
                <li class="nav-item">
                  <Link class={tab === 'articles' ? 'nav-link active' : 'nav-link'} href={base} preserveState>
                    My Articles
                  </Link>
                </li>
                <li class="nav-item">
                  <Link
                    class={tab === 'favorites' ? 'nav-link active' : 'nav-link'}
                    href={`${base}/favorites`}
                    preserveState
                  >
                    Favorited Articles
                  </Link>
                </li>
              </ul>
            </div>

            <ArticleList articles={articles} url={url} />
          </div>
        </div>
      </div>
    </div>
  )
}
