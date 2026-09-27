import { Link, usePage } from '@adwd/inertia-preact'
import type { ComponentChildren } from 'preact'
import { avatar, profileUrl } from '../format.ts'

function NavLink({ href, active, children }: { href: string; active: boolean; children: ComponentChildren }) {
  return (
    <li class="nav-item">
      <Link class={active ? 'nav-link active' : 'nav-link'} href={href}>
        {children}
      </Link>
    </li>
  )
}

export default function Layout({ children }: { children?: ComponentChildren }) {
  const { url, props } = usePage()
  const user = props.auth.user
  const path = url.split('?')[0]

  return (
    <>
      <nav class="navbar navbar-light">
        <div class="container">
          <Link class="navbar-brand" href="/">
            conduit
          </Link>
          <ul class="nav navbar-nav pull-xs-right">
            <NavLink href="/" active={path === '/'}>
              Home
            </NavLink>
            {user ? (
              <>
                <NavLink href="/editor" active={path === '/editor'}>
                  <i class="ion-compose" />
                  &nbsp;New Article
                </NavLink>
                <NavLink href="/settings" active={path === '/settings'}>
                  <i class="ion-gear-a" />
                  &nbsp;Settings
                </NavLink>
                <NavLink href={profileUrl(user.username)} active={path === profileUrl(user.username)}>
                  <img src={avatar(user.image)} class="user-pic" alt="" />
                  {user.username}
                </NavLink>
              </>
            ) : (
              <>
                <NavLink href="/login" active={path === '/login'}>
                  Sign in
                </NavLink>
                <NavLink href="/register" active={path === '/register'}>
                  Sign up
                </NavLink>
              </>
            )}
          </ul>
        </div>
      </nav>

      {children}

      <footer>
        <div class="container">
          <Link href="/" class="logo-font">
            conduit
          </Link>
          <span class="attribution">
            An interactive learning project from <a href="https://thinkster.io">Thinkster</a>. Code &amp; design
            licensed under MIT. Built with Hono, Inertia and Preact.
          </span>
        </div>
      </footer>
    </>
  )
}
