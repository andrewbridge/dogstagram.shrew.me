import { spawnModal } from "../components/ProgrammaticModals.mjs";
import UpsertConfigurationModal from "../components/UpsertConfigurationModal.mjs";
import { css } from "../deps/goober.mjs";
import { configurations, shareConfiguration } from "../services/configurations.mjs";

const styles = css``;

export default {
    name: 'Configure',
    data: () => ({ configurations, shareLinkCopied: null }),
    methods: {
        openConfigurationModal(configuration) {
            spawnModal(UpsertConfigurationModal, { modelValue: configuration });
        },
        async copyShareLink(configuration) {
            const shareData = await shareConfiguration(configuration.uid);
            const url = new URL(window.location.href);
            const searchParams = new URLSearchParams();
            searchParams.set('configuration', shareData);
            url.pathname = '';
            url.hash = `#/import?${searchParams.toString()}`;
            navigator.clipboard.writeText(url.href);
            this.shareLinkCopied = configuration.uid;
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (this.shareLinkCopied === configuration.uid) {
                this.shareLinkCopied = null;
            }
        }
    },
    template: /*html*/`
        <div class="page-header d-print-none">
            <div class="container-xl">
                <div class="row g-2 align-items-center">
                    <div class="col">
                        <h2 class="page-title">
                            Configuration
                        </h2>
                        <div class="mt-1">
                            <a href="#/" class="text-secondary">
                                <!-- Download SVG icon from http://tabler.io/icons/icon/arrow-narrow-left -->
                                <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-narrow-left"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l14 0" /><path d="M5 12l4 4" /><path d="M5 12l4 -4" /></svg>
                                View rota
                            </a>
                        </div>
                    </div>
                    <!-- Page title actions -->
                    <div class="col-auto ms-auto d-print-none">
                        <button class="btn btn-primary btn-3" @click="openConfigurationModal()">
                            <!-- Download SVG icon from http://tabler.io/icons/icon/plus -->
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-2"><path d="M12 5l0 14"></path><path d="M5 12l14 0"></path></svg>
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="page-body ${styles}">
            <div class="container-xl">
                <div class="row row-cards">
                    <div class="col-12" v-if="configurations.length === 0">
                        <div class="card">
                            <div class="card-body">
                                <div class="text-center py-4">
                                    <!-- Download SVG icon from http://tabler.io/icons/icon/alert-triangle -->
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon mb-2 text-info icon-lg"><path d="M12 9v4"></path><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"></path><path d="M12 16h.01"></path></svg>
                                    <h3>No configurations</h3>
                                    <button class="btn btn-primary btn-3" @click="openConfigurationModal()">
                                        <!-- Download SVG icon from http://tabler.io/icons/icon/plus -->
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-2"><path d="M12 5l0 14"></path><path d="M5 12l14 0"></path></svg>
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="space-y" v-else>
                        <div class="card" v-for="configuration in configurations" :key="configuration.uid">
                            <div class="row">
                                <div class="col-11">
                                    <div class="card-body">
                                        <div class="row">
                                            <div class="col"><h3 class="mb-0">{{configuration.name}}</h3></div>
                                        </div>
                                        <div class="row">
                                            <div class="col-md">
                                                <div class="mt-3 list-inline list-inline-dots mb-0 text-secondary d-sm-block d-none">
                                                    <div class="list-inline-item">
                                                        <!-- Download SVG icon from http://tabler.io/icons/icon/user -->
                                                        <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-user"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /></svg>
                                                        {{configuration.members.length}} members
                                                    </div>
                                                    <div class="list-inline-item">
                                                        <!-- Download SVG icon from http://tabler.io/icons/icon/tag -->
                                                        <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-tag"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592 -5.592a2.41 2.41 0 0 0 0 -3.408l-7.71 -7.71a2 2 0 0 0 -1.414 -.586h-5.172a3 3 0 0 0 -3 3z" /></svg>
                                                        {{configuration.roles.length}} roles
                                                    </div>
                                                    <div class="list-inline-item">
                                                        <!-- Download SVG icon from http://tabler.io/icons/icon/calendar-week -->
                                                        <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-calendar-week"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /><path d="M7 14h.013" /><path d="M10.01 14h.005" /><path d="M13.01 14h.005" /><path d="M16.015 14h.005" /><path d="M13.015 17h.005" /><path d="M7.01 17h.005" /><path d="M10.01 17h.005" /></svg>
                                                        {{configuration.numberOfWeeks}} weeks
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-auto d-flex align-items-center">
                                    <div class="row g-2">
                                        <div class="col-auto">
                                            <button class="btn btn-icon" aria-label="Edit configuration" @click="openConfigurationModal(configuration)">
                                                <!-- Download SVG icon from http://tabler.io/icons/icon/pencil -->
                                                <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-pencil"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" /></svg>
                                            </button>
                                        </div>
                                        <div class="col-auto">
                                            <button class="btn btn-icon" aria-label="Share configuration" @click="copyShareLink(configuration)">
                                                <!-- Download SVG icon from http://tabler.io/icons/icon/share-2 -->
                                                <svg v-if="shareLinkCopied !== configuration.uid" xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-share-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 9h-1a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-8a2 2 0 0 0 -2 -2h-1" /><path d="M12 14v-11" /><path d="M9 6l3 -3l3 3" /></svg>
                                                <!-- Download SVG icon from http://tabler.io/icons/icon/check -->
                                                <svg v-else xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-check"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`
}