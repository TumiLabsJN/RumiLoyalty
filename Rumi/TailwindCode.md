# Screen 1: Dashboard
## Shell - Sidebar Layout
<!-- Include this script tag or install `@tailwindplus/elements` via npm: -->
<!-- <script src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1" type="module"></script> -->
<!--
  This example requires updating your template:

  ```
  <html class="h-full bg-gray-900">
  <body class="h-full">
  ```
-->

<el-dialog>
  <dialog id="sidebar" class="backdrop:bg-transparent lg:hidden">
    <el-dialog-backdrop class="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"></el-dialog-backdrop>

    <div tabindex="0" class="fixed inset-0 flex focus:outline-none">
      <el-dialog-panel class="group/dialog-panel relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full">
        <div class="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out group-data-closed/dialog-panel:opacity-0">
          <button type="button" command="close" commandfor="sidebar" class="-m-2.5 p-2.5">
            <span class="sr-only">Close sidebar</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 text-white">
              <path d="M6 18 18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <!-- Sidebar component, swap this element with another sidebar if you like -->
        <div class="relative flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-2 ring ring-white/10 before:pointer-events-none before:absolute before:inset-0 before:bg-black/10">
          <div class="relative flex h-16 shrink-0 items-center">
            <img src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500" alt="Your Company" class="h-8 w-auto" />
          </div>
          <nav class="relative flex flex-1 flex-col">
            <ul role="list" class="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" class="-mx-2 space-y-1">
                  <li>
                    <!-- Current: "bg-white/5 text-white", Default: "text-gray-400 hover:text-white hover:bg-white/5" -->
                    <a href="#" class="group flex gap-x-3 rounded-md bg-white/5 p-2 text-sm/6 font-semibold text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 shrink-0 text-white">
                        <path d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      Dashboard
                    </a>
                  </li>
                  <li>
                    <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 shrink-0 text-gray-400 group-hover:text-white">
                        <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      Team
                    </a>
                  </li>
                  <li>
                    <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 shrink-0 text-gray-400 group-hover:text-white">
                        <path d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      Projects
                    </a>
                  </li>
                  <li>
                    <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 shrink-0 text-gray-400 group-hover:text-white">
                        <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      Calendar
                    </a>
                  </li>
                  <li>
                    <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 shrink-0 text-gray-400 group-hover:text-white">
                        <path d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      Documents
                    </a>
                  </li>
                  <li>
                    <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 shrink-0 text-gray-400 group-hover:text-white">
                        <path d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      Reports
                    </a>
                  </li>
                </ul>
              </li>
              <li>
                <div class="text-xs/6 font-semibold text-gray-400">Your teams</div>
                <ul role="list" class="-mx-2 mt-2 space-y-1">
                  <li>
                    <!-- Current: "bg-white/5 text-white", Default: "text-gray-400 hover:text-white hover:bg-white/5" -->
                    <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                      <span class="flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[0.625rem] font-medium text-gray-400 group-hover:border-white/20 group-hover:text-white">H</span>
                      <span class="truncate">Heroicons</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                      <span class="flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[0.625rem] font-medium text-gray-400 group-hover:border-white/20 group-hover:text-white">T</span>
                      <span class="truncate">Tailwind Labs</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                      <span class="flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[0.625rem] font-medium text-gray-400 group-hover:border-white/20 group-hover:text-white">W</span>
                      <span class="truncate">Workcation</span>
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </el-dialog-panel>
    </div>
  </dialog>
</el-dialog>

<!-- Static sidebar for desktop -->
<div class="hidden bg-gray-900 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
  <!-- Sidebar component, swap this element with another sidebar if you like -->
  <div class="flex grow flex-col gap-y-5 overflow-y-auto border-r border-white/10 bg-black/10 px-6">
    <div class="flex h-16 shrink-0 items-center">
      <img src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500" alt="Your Company" class="h-8 w-auto" />
    </div>
    <nav class="flex flex-1 flex-col">
      <ul role="list" class="flex flex-1 flex-col gap-y-7">
        <li>
          <ul role="list" class="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" class="-mx-2 space-y-1">
                <li>
                  <!-- Current: "bg-white/5 text-white", Default: "text-gray-400 hover:text-white hover:bg-white/5" -->
                  <a href="#" class="group flex gap-x-3 rounded-md bg-white/5 p-2 text-sm/6 font-semibold text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 shrink-0 text-white">
                      <path d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    Dashboard
                  </a>
                </li>
                <li>
                  <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 shrink-0 text-gray-400 group-hover:text-white">
                      <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    Team
                  </a>
                </li>
                <li>
                  <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 shrink-0 text-gray-400 group-hover:text-white">
                      <path d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    Projects
                  </a>
                </li>
                <li>
                  <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 shrink-0 text-gray-400 group-hover:text-white">
                      <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    Calendar
                  </a>
                </li>
                <li>
                  <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 shrink-0 text-gray-400 group-hover:text-white">
                      <path d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    Documents
                  </a>
                </li>
                <li>
                  <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6 shrink-0 text-gray-400 group-hover:text-white">
                      <path d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    Reports
                  </a>
                </li>
              </ul>
            </li>
            <li>
              <div class="text-xs/6 font-semibold text-gray-400">Your teams</div>
              <ul role="list" class="-mx-2 mt-2 space-y-1">
                <li>
                  <!-- Current: "bg-white/5 text-white", Default: "text-gray-400 hover:text-white hover:bg-white/5" -->
                  <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[0.625rem] font-medium text-gray-400 group-hover:border-white/20 group-hover:text-white">H</span>
                    <span class="truncate">Heroicons</span>
                  </a>
                </li>
                <li>
                  <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[0.625rem] font-medium text-gray-400 group-hover:border-white/20 group-hover:text-white">T</span>
                    <span class="truncate">Tailwind Labs</span>
                  </a>
                </li>
                <li>
                  <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[0.625rem] font-medium text-gray-400 group-hover:border-white/20 group-hover:text-white">W</span>
                    <span class="truncate">Workcation</span>
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </li>
        <li class="-mx-6 mt-auto">
          <a href="#" class="flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-white hover:bg-white/5">
            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" class="size-8 rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10" />
            <span class="sr-only">Your profile</span>
            <span aria-hidden="true">Tom Cook</span>
          </a>
        </li>
      </ul>
    </nav>
  </div>
</div>

<div class="sticky top-0 z-40 flex items-center gap-x-6 bg-gray-900 px-4 py-4 after:pointer-events-none after:absolute after:inset-0 after:border-b after:border-white/10 after:bg-black/10 sm:px-6 lg:hidden">
  <button type="button" command="show-modal" commandfor="sidebar" class="-m-2.5 p-2.5 text-gray-400 hover:text-white lg:hidden">
    <span class="sr-only">Open sidebar</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6">
      <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>
  <div class="flex-1 text-sm/6 font-semibold text-white">Dashboard</div>
  <a href="#">
    <span class="sr-only">Your profile</span>
    <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" class="size-8 rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10" />
  </a>
</div>

<main class="py-10 lg:pl-72">
  <div class="px-4 sm:px-6 lg:px-8">
    <!-- Your content -->
  </div>
</main>
## Section headers - Card headings or section headings
## Task Lists - Stacked lists
## Empty State - Empty states
## Divider (today/week) - Dividers

## Headings
### Simple
  <div class="border-b border-white/10 pb-5">
    <h3 class="text-base font-semibold text-white">TODAY'S TASKS</h3>
  </div>

## Lists 

### With Links
<ul role="list" class="divide-y divide-white/5">
  <li class="relative flex justify-between gap-x-6 py-5">
    <div class="flex min-w-0 gap-x-4">
      <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" class="size-12 flex-none rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10" />
      <div class="min-w-0 flex-auto">
        <p class="text-sm/6 font-semibold text-white">
          <a href="#">
            <span class="absolute inset-x-0 -top-px bottom-0"></span>
            Leslie Alexander
          </a>
        </p>
        <p class="mt-1 flex text-xs/5 text-gray-400">
          <a href="mailto:leslie.alexander@example.com" class="relative truncate hover:underline">leslie.alexander@example.com</a>
        </p>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-x-4">
      <div class="hidden sm:flex sm:flex-col sm:items-end">
        <p class="text-sm/6 text-white">Co-Founder / CEO</p>
        <p class="mt-1 text-xs/5 text-gray-400">Last seen <time datetime="2023-01-23T13:23Z">3h ago</time></p>
      </div>
      <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="size-5 flex-none text-gray-500">
        <path d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
      </svg>
    </div>
  </li>
  <li class="relative flex justify-between gap-x-6 py-5">
    <div class="flex min-w-0 gap-x-4">
      <img src="https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" class="size-12 flex-none rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10" />
      <div class="min-w-0 flex-auto">
        <p class="text-sm/6 font-semibold text-white">
          <a href="#">
            <span class="absolute inset-x-0 -top-px bottom-0"></span>
            Michael Foster
          </a>
        </p>
        <p class="mt-1 flex text-xs/5 text-gray-400">
          <a href="mailto:michael.foster@example.com" class="relative truncate hover:underline">michael.foster@example.com</a>
        </p>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-x-4">
      <div class="hidden sm:flex sm:flex-col sm:items-end">
        <p class="text-sm/6 text-white">Co-Founder / CTO</p>
        <p class="mt-1 text-xs/5 text-gray-400">Last seen <time datetime="2023-01-23T13:23Z">3h ago</time></p>
      </div>
      <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="size-5 flex-none text-gray-500">
        <path d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
      </svg>
    </div>
  </li>
  <li class="relative flex justify-between gap-x-6 py-5">
    <div class="flex min-w-0 gap-x-4">
      <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" class="size-12 flex-none rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10" />
      <div class="min-w-0 flex-auto">
        <p class="text-sm/6 font-semibold text-white">
          <a href="#">
            <span class="absolute inset-x-0 -top-px bottom-0"></span>
            Dries Vincent
          </a>
        </p>
        <p class="mt-1 flex text-xs/5 text-gray-400">
          <a href="mailto:dries.vincent@example.com" class="relative truncate hover:underline">dries.vincent@example.com</a>
        </p>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-x-4">
      <div class="hidden sm:flex sm:flex-col sm:items-end">
        <p class="text-sm/6 text-white">Business Relations</p>
        <div class="mt-1 flex items-center gap-x-1.5">
          <div class="flex-none rounded-full bg-emerald-500/30 p-1">
            <div class="size-1.5 rounded-full bg-emerald-500"></div>
          </div>
          <p class="text-xs/5 text-gray-400">Online</p>
        </div>
      </div>
      <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="size-5 flex-none text-gray-500">
        <path d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
      </svg>
    </div>
  </li>
  <li class="relative flex justify-between gap-x-6 py-5">
    <div class="flex min-w-0 gap-x-4">
      <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" class="size-12 flex-none rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10" />
      <div class="min-w-0 flex-auto">
        <p class="text-sm/6 font-semibold text-white">
          <a href="#">
            <span class="absolute inset-x-0 -top-px bottom-0"></span>
            Lindsay Walton
          </a>
        </p>
        <p class="mt-1 flex text-xs/5 text-gray-400">
          <a href="mailto:lindsay.walton@example.com" class="relative truncate hover:underline">lindsay.walton@example.com</a>
        </p>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-x-4">
      <div class="hidden sm:flex sm:flex-col sm:items-end">
        <p class="text-sm/6 text-white">Front-end Developer</p>
        <p class="mt-1 text-xs/5 text-gray-400">Last seen <time datetime="2023-01-23T13:23Z">3h ago</time></p>
      </div>
      <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="size-5 flex-none text-gray-500">
        <path d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
      </svg>
    </div>
  </li>
  <li class="relative flex justify-between gap-x-6 py-5">
    <div class="flex min-w-0 gap-x-4">
      <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" class="size-12 flex-none rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10" />
      <div class="min-w-0 flex-auto">
        <p class="text-sm/6 font-semibold text-white">
          <a href="#">
            <span class="absolute inset-x-0 -top-px bottom-0"></span>
            Courtney Henry
          </a>
        </p>
        <p class="mt-1 flex text-xs/5 text-gray-400">
          <a href="mailto:courtney.henry@example.com" class="relative truncate hover:underline">courtney.henry@example.com</a>
        </p>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-x-4">
      <div class="hidden sm:flex sm:flex-col sm:items-end">
        <p class="text-sm/6 text-white">Designer</p>
        <p class="mt-1 text-xs/5 text-gray-400">Last seen <time datetime="2023-01-23T13:23Z">3h ago</time></p>
      </div>
      <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="size-5 flex-none text-gray-500">
        <path d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
      </svg>
    </div>
  </li>
  <li class="relative flex justify-between gap-x-6 py-5">
    <div class="flex min-w-0 gap-x-4">
      <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" class="size-12 flex-none rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10" />
      <div class="min-w-0 flex-auto">
        <p class="text-sm/6 font-semibold text-white">
          <a href="#">
            <span class="absolute inset-x-0 -top-px bottom-0"></span>
            Tom Cook
          </a>
        </p>
        <p class="mt-1 flex text-xs/5 text-gray-400">
          <a href="mailto:tom.cook@example.com" class="relative truncate hover:underline">tom.cook@example.com</a>
        </p>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-x-4">
      <div class="hidden sm:flex sm:flex-col sm:items-end">
        <p class="text-sm/6 text-white">Director of Product</p>
        <div class="mt-1 flex items-center gap-x-1.5">
          <div class="flex-none rounded-full bg-emerald-500/30 p-1">
            <div class="size-1.5 rounded-full bg-emerald-500"></div>
          </div>
          <p class="text-xs/5 text-gray-400">Online</p>
        </div>
      </div>
      <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="size-5 flex-none text-gray-500">
        <path d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
      </svg>
    </div>
  </li>
</ul>


## Empty States

### Simple
<div class="text-center">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" class="mx-auto size-12 text-gray-500">
    <path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <h3 class="mt-2 text-sm font-semibold text-white">No projects</h3>
  <p class="mt-1 text-sm text-gray-400">Get started by creating a new project.</p>
  <div class="mt-6">
    <button type="button" class="inline-flex items-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
      <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="mr-1.5 -ml-0.5 size-5">
        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
      </svg>
      New Project
    </button>
  </div>
</div>



## Dividers
### With title
<div class="flex items-center">
  <div aria-hidden="true" class="w-full border-t border-white/15"></div>
  <div class="relative flex justify-center">
    <span class="bg-gray-900 px-3 text-base font-semibold text-white">Projects</span>
  </div>
  <div aria-hidden="true" class="w-full border-t border-white/15"></div>
</div>


# Screen 2: Redemptions
## Headings with Tabs
<div>
  <div class="grid grid-cols-1 sm:hidden">
    <!-- Use an "onChange" listener to redirect the user to the selected tab URL. -->
    <select aria-label="Select a tab" class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 py-2 pr-8 pl-3 text-base text-gray-100 outline-1 -outline-offset-1 outline-white/10 *:bg-gray-800 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500">
      <option>My Account</option>
      <option>Company</option>
      <option selected>Team Members</option>
      <option>Billing</option>
    </select>
    <svg viewBox="0 0 16 16" fill="currentColor" data-slot="icon" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-400">
      <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
    </svg>
  </div>
  <div class="hidden sm:block">
    <div class="border-b border-white/10">
      <nav aria-label="Tabs" class="-mb-px flex space-x-8">
        <!-- Current: "border-indigo-400 text-indigo-400", Default: "border-transparent text-gray-400 hover:border-white/20 hover:text-gray-200" -->
        <a href="#" class="border-b-2 border-transparent px-1 py-4 text-sm font-medium whitespace-nowrap text-gray-400 hover:border-white/20 hover:text-gray-200">My Account</a>
        <a href="#" class="border-b-2 border-transparent px-1 py-4 text-sm font-medium whitespace-nowrap text-gray-400 hover:border-white/20 hover:text-gray-200">Company</a>
        <a href="#" aria-current="page" class="border-b-2 border-indigo-400 px-1 py-4 text-sm font-medium whitespace-nowrap text-indigo-400">Team Members</a>
        <a href="#" class="border-b-2 border-transparent px-1 py-4 text-sm font-medium whitespace-nowrap text-gray-400 hover:border-white/20 hover:text-gray-200">Billing</a>
      </nav>
    </div>
  </div>
</div>


## Tables - simple
<div class="px-4 sm:px-6 lg:px-8">
  <div class="sm:flex sm:items-center">
    <div class="sm:flex-auto">
      <h1 class="text-base font-semibold text-white">Users</h1>
      <p class="mt-2 text-sm text-gray-300">A list of all the users in your account including their name, title, email and role.</p>
    </div>
    <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
      <button type="button" class="block rounded-md bg-indigo-500 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Add user</button>
    </div>
  </div>
  <div class="mt-8 flow-root">
    <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <table class="relative min-w-full divide-y divide-white/15">
          <thead>
            <tr>
              <th scope="col" class="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-white sm:pl-0">Name</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Title</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Email</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Role</th>
              <th scope="col" class="py-3.5 pr-4 pl-3 sm:pr-0">
                <span class="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr>
              <td class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-white sm:pl-0">Lindsay Walton</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">Front-end Developer</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">lindsay.walton@example.com</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">Member</td>
              <td class="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                <a href="#" class="text-indigo-400 hover:text-indigo-300">Edit<span class="sr-only">, Lindsay Walton</span></a>
              </td>
            </tr>
            <tr>
              <td class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-white sm:pl-0">Courtney Henry</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">Designer</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">courtney.henry@example.com</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">Admin</td>
              <td class="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                <a href="#" class="text-indigo-400 hover:text-indigo-300">Edit<span class="sr-only">, Courtney Henry</span></a>
              </td>
            </tr>
            <tr>
              <td class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-white sm:pl-0">Tom Cook</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">Director of Product</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">tom.cook@example.com</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">Member</td>
              <td class="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                <a href="#" class="text-indigo-400 hover:text-indigo-300">Edit<span class="sr-only">, Tom Cook</span></a>
              </td>
            </tr>
            <tr>
              <td class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-white sm:pl-0">Whitney Francis</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">Copywriter</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">whitney.francis@example.com</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">Admin</td>
              <td class="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                <a href="#" class="text-indigo-400 hover:text-indigo-300">Edit<span class="sr-only">, Whitney Francis</span></a>
              </td>
            </tr>
            <tr>
              <td class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-white sm:pl-0">Leonard Krasner</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">Senior Designer</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">leonard.krasner@example.com</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">Owner</td>
              <td class="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                <a href="#" class="text-indigo-400 hover:text-indigo-300">Edit<span class="sr-only">, Leonard Krasner</span></a>
              </td>
            </tr>
            <tr>
              <td class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-white sm:pl-0">Floyd Miles</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">Principal Designer</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">floyd.miles@example.com</td>
              <td class="px-3 py-4 text-sm whitespace-nowrap text-gray-400">Member</td>
              <td class="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                <a href="#" class="text-indigo-400 hover:text-indigo-300">Edit<span class="sr-only">, Floyd Miles</span></a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

## Drawer - with sticky footer
<!-- Include this script tag or install `@tailwindplus/elements` via npm: -->
<!-- <script src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1" type="module"></script> -->
<button command="show-modal" commandfor="drawer" class="rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-semibold text-white inset-ring inset-ring-white/5 hover:bg-white/20">Open drawer</button>
<el-dialog>
  <dialog id="drawer" aria-labelledby="drawer-title" class="fixed inset-0 size-auto max-h-none max-w-none overflow-hidden bg-transparent backdrop:bg-transparent">
    <div tabindex="0" class="absolute inset-0 pl-10 focus:outline-none sm:pl-16">
      <el-dialog-panel class="ml-auto block size-full max-w-md transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700">
        <div class="relative flex h-full flex-col divide-y divide-white/10 bg-gray-800 shadow-xl after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-white/10">
          <div class="flex min-h-0 flex-1 flex-col overflow-y-auto py-6">
            <div class="px-4 sm:px-6">
              <div class="flex items-start justify-between">
                <h2 id="drawer-title" class="text-base font-semibold text-white">Panel title</h2>
                <div class="ml-3 flex h-7 items-center">
                  <button type="button" command="close" commandfor="drawer" class="relative rounded-md text-gray-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
                    <span class="absolute -inset-2.5"></span>
                    <span class="sr-only">Close panel</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6">
                      <path d="M6 18 18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="relative mt-6 flex-1 px-4 sm:px-6">
              <!-- Your content -->
            </div>
          </div>
          <div class="flex shrink-0 justify-end px-4 py-4">
            <button type="button" command="close" commandfor="drawer" class="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white inset-ring inset-ring-white/5 hover:bg-white/20">Cancel</button>
            <button type="submit" class="ml-4 inline-flex justify-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Save</button>
          </div>
        </div>
      </el-dialog-panel>
    </div>
  </dialog>
</el-dialog>


## Badges - Pill with border
<span class="inline-flex items-center rounded-full bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400 inset-ring inset-ring-gray-400/20">Badge</span>
<span class="inline-flex items-center rounded-full bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 inset-ring inset-ring-red-400/20">Badge</span>
<span class="inline-flex items-center rounded-full bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-500 inset-ring inset-ring-yellow-400/20">Badge</span>
<span class="inline-flex items-center rounded-full bg-green-400/10 px-2 py-1 text-xs font-medium text-green-400 inset-ring inset-ring-green-500/20">Badge</span>
<span class="inline-flex items-center rounded-full bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400 inset-ring inset-ring-blue-400/30">Badge</span>
<span class="inline-flex items-center rounded-full bg-indigo-400/10 px-2 py-1 text-xs font-medium text-indigo-400 inset-ring inset-ring-indigo-400/30">Badge</span>
<span class="inline-flex items-center rounded-full bg-purple-400/10 px-2 py-1 text-xs font-medium text-purple-400 inset-ring inset-ring-purple-400/30">Badge</span>
<span class="inline-flex items-center rounded-full bg-pink-400/10 px-2 py-1 text-xs font-medium text-pink-400 inset-ring inset-ring-pink-400/20">Badge</span>

## Buttons - Primary
<button type="button" class="rounded-sm bg-indigo-500 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Button text</button>
<button type="button" class="rounded-sm bg-indigo-500 px-2 py-1 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Button text</button>
<button type="button" class="rounded-md bg-indigo-500 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Button text</button>
<button type="button" class="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Button text</button>
<button type="button" class="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Button text</button>


# Screen 3: Missions
## Headings - with actions
<div class="md:flex md:items-center md:justify-between">
  <div class="min-w-0 flex-1">
    <h2 class="text-2xl/7 font-bold text-white sm:truncate sm:text-3xl sm:tracking-tight">Back End Developer</h2>
  </div>
  <div class="mt-4 flex md:mt-0 md:ml-4">
    <button type="button" class="inline-flex items-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white inset-ring inset-ring-white/5 hover:bg-white/20">Edit</button>
    <button type="button" class="ml-3 inline-flex items-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400">Publish</button>
  </div>
</div>


## Input Groups - Input with label
<div>
  <label for="email" class="block text-sm/6 font-medium text-white">Email</label>
  <div class="mt-2">
    <input id="email" type="email" name="email" placeholder="you@example.com" class="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6" />
  </div>
</div>


## Select Menus - simple native
<label for="location" class="block text-sm/6 font-medium text-white">Location</label>
<div class="mt-2 grid grid-cols-1">
  <select id="location" name="location" class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 py-1.5 pr-8 pl-3 text-base text-white outline-1 -outline-offset-1 outline-white/10 *:bg-gray-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 sm:text-sm/6">
    <option>United States</option>
    <option selected>Canada</option>
    <option>Mexico</option>
  </select>
  <svg viewBox="0 0 16 16" fill="currentColor" data-slot="icon" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-400 sm:size-4">
    <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
  </svg>
</div>


## Radio Groups - simple inline list
<fieldset>
  <legend class="text-sm/6 font-semibold text-white">Notifications</legend>
  <p class="mt-1 text-sm/6 text-gray-400">How do you prefer to receive notifications?</p>
  <div class="mt-6 space-y-6 sm:flex sm:items-center sm:space-y-0 sm:space-x-10">
    <div class="flex items-center">
      <input id="email" type="radio" name="notification-method" checked class="relative size-4 appearance-none rounded-full border border-white/10 bg-white/5 before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-500 checked:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-white/5 disabled:bg-white/10 disabled:before:bg-white/20 forced-colors:appearance-auto forced-colors:before:hidden" />
      <label for="email" class="ml-3 block text-sm/6 font-medium text-white">Email</label>
    </div>
    <div class="flex items-center">
      <input id="sms" type="radio" name="notification-method" class="relative size-4 appearance-none rounded-full border border-white/10 bg-white/5 before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-500 checked:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-white/5 disabled:bg-white/10 disabled:before:bg-white/20 forced-colors:appearance-auto forced-colors:before:hidden" />
      <label for="sms" class="ml-3 block text-sm/6 font-medium text-white">Phone (SMS)</label>
    </div>
    <div class="flex items-center">
      <input id="push" type="radio" name="notification-method" class="relative size-4 appearance-none rounded-full border border-white/10 bg-white/5 before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-500 checked:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-white/5 disabled:bg-white/10 disabled:before:bg-white/20 forced-colors:appearance-auto forced-colors:before:hidden" />
      <label for="push" class="ml-3 block text-sm/6 font-medium text-white">Push notification</label>
    </div>
  </div>
</fieldset>


## Toggles - With right label
<div class="flex items-center justify-between gap-3">
  <div class="group relative inline-flex w-11 shrink-0 rounded-full bg-white/5 p-0.5 inset-ring inset-ring-white/10 outline-offset-2 outline-indigo-500 transition-colors duration-200 ease-in-out has-checked:bg-indigo-500 has-focus-visible:outline-2">
    <span class="size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-5"></span>
    <input id="annual-billing" type="checkbox" name="annual-billing" aria-labelledby="annual-billing-label" aria-describedby="annual-billing-description" class="absolute inset-0 appearance-none focus:outline-hidden" />
  </div>

  <div class="text-sm">
    <label id="annual-billing-label" class="font-medium text-white">Annual billing</label>
    <span id="annual-billing-description" class="text-gray-400">(Save 10%)</span>
  </div>
</div>

# Screen 5: Sales Adjustment
## Description Lists - Left aligned
<div>
  <div class="px-4 sm:px-0">
    <h3 class="text-base/7 font-semibold text-white">Applicant Information</h3>
    <p class="mt-1 max-w-2xl text-sm/6 text-gray-400">Personal details and application.</p>
  </div>
  <div class="mt-6 border-t border-white/10">
    <dl class="divide-y divide-white/10">
      <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
        <dt class="text-sm/6 font-medium text-gray-100">Full name</dt>
        <dd class="mt-1 text-sm/6 text-gray-400 sm:col-span-2 sm:mt-0">Margot Foster</dd>
      </div>
      <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
        <dt class="text-sm/6 font-medium text-gray-100">Application for</dt>
        <dd class="mt-1 text-sm/6 text-gray-400 sm:col-span-2 sm:mt-0">Backend Developer</dd>
      </div>
      <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
        <dt class="text-sm/6 font-medium text-gray-100">Email address</dt>
        <dd class="mt-1 text-sm/6 text-gray-400 sm:col-span-2 sm:mt-0">margotfoster@example.com</dd>
      </div>
      <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
        <dt class="text-sm/6 font-medium text-gray-100">Salary expectation</dt>
        <dd class="mt-1 text-sm/6 text-gray-400 sm:col-span-2 sm:mt-0">$120,000</dd>
      </div>
      <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
        <dt class="text-sm/6 font-medium text-gray-100">About</dt>
        <dd class="mt-1 text-sm/6 text-gray-400 sm:col-span-2 sm:mt-0">Fugiat ipsum ipsum deserunt culpa aute sint do nostrud anim incididunt cillum culpa consequat. Excepteur qui ipsum aliquip consequat sint. Sit id mollit nulla mollit nostrud in ea officia proident. Irure nostrud pariatur mollit ad adipisicing reprehenderit deserunt qui eu.</dd>
      </div>
      <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
        <dt class="text-sm/6 font-medium text-gray-100">Attachments</dt>
        <dd class="mt-2 text-sm text-white sm:col-span-2 sm:mt-0">
          <ul role="list" class="divide-y divide-white/5 rounded-md border border-white/10">
            <li class="flex items-center justify-between py-4 pr-5 pl-4 text-sm/6">
              <div class="flex w-0 flex-1 items-center">
                <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="size-5 shrink-0 text-gray-500">
                  <path d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" clip-rule="evenodd" fill-rule="evenodd" />
                </svg>
                <div class="ml-4 flex min-w-0 flex-1 gap-2">
                  <span class="truncate font-medium text-white">resume_back_end_developer.pdf</span>
                  <span class="shrink-0 text-gray-500">2.4mb</span>
                </div>
              </div>
              <div class="ml-4 shrink-0">
                <a href="#" class="font-medium text-indigo-400 hover:text-indigo-300">Download</a>
              </div>
            </li>
            <li class="flex items-center justify-between py-4 pr-5 pl-4 text-sm/6">
              <div class="flex w-0 flex-1 items-center">
                <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="size-5 shrink-0 text-gray-500">
                  <path d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" clip-rule="evenodd" fill-rule="evenodd" />
                </svg>
                <div class="ml-4 flex min-w-0 flex-1 gap-2">
                  <span class="truncate font-medium text-white">coverletter_back_end_developer.pdf</span>
                  <span class="shrink-0 text-gray-500">4.5mb</span>
                </div>
              </div>
              <div class="ml-4 shrink-0">
                <a href="#" class="font-medium text-indigo-400 hover:text-indigo-300">Download</a>
              </div>
            </li>
          </ul>
        </dd>
      </div>
    </dl>
  </div>
</div>



# Screen 7: Data Sync
## Dividers - With title
<div class="flex items-center">
  <div aria-hidden="true" class="w-full border-t border-white/15"></div>
  <div class="relative flex justify-center">
    <span class="bg-gray-900 px-3 text-base font-semibold text-white">Projects</span>
  </div>
  <div aria-hidden="true" class="w-full border-t border-white/15"></div>
</div>

## File Upload - Simple styled
<div>
  <label for="file-upload" class="block text-sm/6 font-medium text-white">CSV File</label>
  <div class="mt-2">
    <input
      id="file-upload"
      type="file"
      name="file-upload"
      accept=".csv"
      class="block w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-indigo-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-400 outline-1 -outline-offset-1 outline-white/10 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
    />
  </div>
  <p class="mt-2 text-xs text-gray-400">CSV files only. Max file size: 10MB</p>
</div>


# Other
## Headings
### Simple + Count (category headers)
 <div class="border-b border-white/10 pb-5">
    <h3 class="text-base font-semibold text-white">🔔 DISCOUNTS TO ACTIVATE <span class="text-gray-400">(2)</span></h3>
  </div>
