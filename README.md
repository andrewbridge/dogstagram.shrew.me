# dog-japes

## Development

This site is build step free, serve it in a browser with any HTTP server, but `npm run serve` is an included command.

To keep dependencies in one place, third party packages are loaded via `modules/deps.mjs` and exposed to the rest of the codebase by exporting as necessary.

Where possible, use an ESM compatible version of the package, or even better don't load a third party package at all.

Vue components are kept withing `modules/components`. Because we include the parser, templates can be provided in a `template` property of the exported component, usually in a template literal string to allow for line breaks and static variable insertion.

We use [goober](https://github.com/cristianbote/goober) to provide lightweight CSS-in-JS functionality, although we currently only use it to generate class names to attach a styles string to a unique class name.

## Content attribution

Images used in the feed game:

- [Wire Daschund Family](https://www.flickr.com/photos/aslives/2662520679/in/photolist-MZVDkv-C2FjpU-Pvr7Th-BVids2-CtNvq6-BwqvFP-54mn7w-bRSdb-6E5m5J-kHJsXi-54h7CX-6E1eYx-ydhz5o-8J6oc2-EHaCD-mQZhMQ-6E1ehn-A69L9k-sDm3E-8RidSr-CTixGK-qjBRm-4yGEGT-oqmn3k-6yHkc9-gWc1qD-BViJeg-gGhtdQ-ec9Ex-5PytgE-8M2v2C-8gZVLG-nw5TwD-aPRhRp-djFo7S-fsXoXM-5PuaGe-EDy4u-5Pua2P-4pSosp-54ha9c-ojCqgz-uSuvE-8YZYz5-EDypB-5Pyu25-9gdxcy-7dWWKt-ebZRgJ-86WJft/)
- [Regal Daschund](https://www.flickr.com/photos/skye_sd/122894354/in/photolist-MZVDkv-C2FjpU-Pvr7Th-BVids2-CtNvq6-BwqvFP-54mn7w-bRSdb-6E5m5J-kHJsXi-54h7CX-6E1eYx-ydhz5o-8J6oc2-EHaCD-mQZhMQ-6E1ehn-A69L9k-sDm3E-8RidSr-CTixGK-qjBRm-4yGEGT-oqmn3k-6yHkc9-gWc1qD-BViJeg-gGhtdQ-ec9Ex-5PytgE-8M2v2C-8gZVLG-nw5TwD-aPRhRp-djFo7S-fsXoXM-5PuaGe-EDy4u-5Pua2P-4pSosp-54ha9c-ojCqgz-uSuvE-8YZYz5-EDypB-5Pyu25-9gdxcy-7dWWKt-ebZRgJ-86WJft/)
- [Daschund](https://www.flickr.com/photos/aphexlee/21142447586/in/photolist-MZVDkv-C2FjpU-Pvr7Th-BVids2-CtNvq6-BwqvFP-54mn7w-bRSdb-6E5m5J-kHJsXi-54h7CX-6E1eYx-ydhz5o-8J6oc2-EHaCD-mQZhMQ-6E1ehn-A69L9k-sDm3E-8RidSr-CTixGK-qjBRm-4yGEGT-oqmn3k-6yHkc9-gWc1qD-BViJeg-gGhtdQ-ec9Ex-5PytgE-8M2v2C-8gZVLG-nw5TwD-aPRhRp-djFo7S-fsXoXM-5PuaGe-EDy4u-5Pua2P-4pSosp-54ha9c-ojCqgz-uSuvE-8YZYz5-EDypB-5Pyu25-9gdxcy-7dWWKt-ebZRgJ-86WJft/)
- [huh?](https://www.flickr.com/photos/_jack_attack_/438058841/in/photolist-MZVDkv-C2FjpU-Pvr7Th-BVids2-CtNvq6-BwqvFP-54mn7w-bRSdb-6E5m5J-kHJsXi-54h7CX-6E1eYx-ydhz5o-8J6oc2-EHaCD-mQZhMQ-6E1ehn-A69L9k-sDm3E-8RidSr-CTixGK-qjBRm-4yGEGT-oqmn3k-6yHkc9-gWc1qD-BViJeg-gGhtdQ-ec9Ex-5PytgE-8M2v2C-8gZVLG-nw5TwD-aPRhRp-djFo7S-fsXoXM-5PuaGe-EDy4u-5Pua2P-4pSosp-54ha9c-ojCqgz-uSuvE-8YZYz5-EDypB-5Pyu25-9gdxcy-7dWWKt-ebZRgJ-86WJft/)
- [Dachshund](https://www.flickr.com/photos/rohit_saxena/13681505034/in/photolist-MZVDkv-C2FjpU-Pvr7Th-BVids2-CtNvq6-BwqvFP-54mn7w-bRSdb-6E5m5J-kHJsXi-54h7CX-6E1eYx-ydhz5o-8J6oc2-EHaCD-mQZhMQ-6E1ehn-A69L9k-sDm3E-8RidSr-CTixGK-qjBRm-4yGEGT-oqmn3k-6yHkc9-gWc1qD-BViJeg-gGhtdQ-ec9Ex-5PytgE-8M2v2C-8gZVLG-nw5TwD-aPRhRp-djFo7S-fsXoXM-5PuaGe-EDy4u-5Pua2P-4pSosp-54ha9c-ojCqgz-uSuvE-8YZYz5-EDypB-5Pyu25-9gdxcy-7dWWKt-ebZRgJ-86WJft/)
- [Pais](https://www.flickr.com/photos/92414546@N04/22374421987/in/photolist-MZVDkv-C2FjpU-Pvr7Th-BVids2-CtNvq6-BwqvFP-54mn7w-bRSdb-6E5m5J-kHJsXi-54h7CX-6E1eYx-ydhz5o-8J6oc2-EHaCD-mQZhMQ-6E1ehn-A69L9k-sDm3E-8RidSr-CTixGK-qjBRm-4yGEGT-oqmn3k-6yHkc9-gWc1qD-BViJeg-gGhtdQ-ec9Ex-5PytgE-8M2v2C-8gZVLG-nw5TwD-aPRhRp-djFo7S-fsXoXM-5PuaGe-EDy4u-5Pua2P-4pSosp-54ha9c-ojCqgz-uSuvE-8YZYz5-EDypB-5Pyu25-9gdxcy-7dWWKt-ebZRgJ-86WJft/)
- [blossom 2](https://www.flickr.com/photos/jblanchard/3651975866/in/photolist-MZVDkv-C2FjpU-Pvr7Th-BVids2-CtNvq6-BwqvFP-54mn7w-bRSdb-6E5m5J-kHJsXi-54h7CX-6E1eYx-ydhz5o-8J6oc2-EHaCD-mQZhMQ-6E1ehn-A69L9k-sDm3E-8RidSr-CTixGK-qjBRm-4yGEGT-oqmn3k-6yHkc9-gWc1qD-BViJeg-gGhtdQ-ec9Ex-5PytgE-8M2v2C-8gZVLG-nw5TwD-aPRhRp-djFo7S-fsXoXM-5PuaGe-EDy4u-5Pua2P-4pSosp-54ha9c-ojCqgz-uSuvE-8YZYz5-EDypB-5Pyu25-9gdxcy-7dWWKt-ebZRgJ-86WJft/)
- [Daschund Julia](https://www.flickr.com/photos/56761195@N00/4775547084/in/photolist-MZVDkv-C2FjpU-Pvr7Th-BVids2-CtNvq6-BwqvFP-54mn7w-bRSdb-6E5m5J-kHJsXi-54h7CX-6E1eYx-ydhz5o-8J6oc2-EHaCD-mQZhMQ-6E1ehn-A69L9k-sDm3E-8RidSr-CTixGK-qjBRm-4yGEGT-oqmn3k-6yHkc9-gWc1qD-BViJeg-gGhtdQ-ec9Ex-5PytgE-8M2v2C-8gZVLG-nw5TwD-aPRhRp-djFo7S-fsXoXM-5PuaGe-EDy4u-5Pua2P-4pSosp-54ha9c-ojCqgz-uSuvE-8YZYz5-EDypB-5Pyu25-9gdxcy-7dWWKt-ebZRgJ-86WJft/)
- [Humph](https://www.flickr.com/photos/edwaado/3162795901/in/photolist-MZVDkv-C2FjpU-Pvr7Th-BVids2-CtNvq6-BwqvFP-54mn7w-bRSdb-6E5m5J-kHJsXi-54h7CX-6E1eYx-ydhz5o-8J6oc2-EHaCD-mQZhMQ-6E1ehn-A69L9k-sDm3E-8RidSr-CTixGK-qjBRm-4yGEGT-oqmn3k-6yHkc9-gWc1qD-BViJeg-gGhtdQ-ec9Ex-5PytgE-8M2v2C-8gZVLG-nw5TwD-aPRhRp-djFo7S-fsXoXM-5PuaGe-EDy4u-5Pua2P-4pSosp-54ha9c-ojCqgz-uSuvE-8YZYz5-EDypB-5Pyu25-9gdxcy-7dWWKt-ebZRgJ-86WJft/)
- [Sadie](https://www.flickr.com/photos/aslives/2662529103/in/photolist-MZVDkv-C2FjpU-Pvr7Th-BVids2-CtNvq6-BwqvFP-54mn7w-bRSdb-6E5m5J-kHJsXi-54h7CX-6E1eYx-ydhz5o-8J6oc2-EHaCD-mQZhMQ-6E1ehn-A69L9k-sDm3E-8RidSr-CTixGK-qjBRm-4yGEGT-oqmn3k-6yHkc9-gWc1qD-BViJeg-gGhtdQ-ec9Ex-5PytgE-8M2v2C-8gZVLG-nw5TwD-aPRhRp-djFo7S-fsXoXM-5PuaGe-EDy4u-5Pua2P-4pSosp-54ha9c-ojCqgz-uSuvE-8YZYz5-EDypB-5Pyu25-9gdxcy-7dWWKt-ebZRgJ-86WJft/)
- [DSC_0274](https://www.flickr.com/photos/utuananas/14650651495/in/photolist-MZVDkv-C2FjpU-Pvr7Th-BVids2-CtNvq6-BwqvFP-54mn7w-bRSdb-6E5m5J-kHJsXi-54h7CX-6E1eYx-ydhz5o-8J6oc2-EHaCD-mQZhMQ-6E1ehn-A69L9k-sDm3E-8RidSr-CTixGK-qjBRm-4yGEGT-oqmn3k-6yHkc9-gWc1qD-BViJeg-gGhtdQ-ec9Ex-5PytgE-8M2v2C-8gZVLG-nw5TwD-aPRhRp-djFo7S-fsXoXM-5PuaGe-EDy4u-5Pua2P-4pSosp-54ha9c-ojCqgz-uSuvE-8YZYz5-EDypB-5Pyu25-9gdxcy-7dWWKt-ebZRgJ-86WJft/)
- [IMG_2084_DxO_RAW](https://www.flickr.com/photos/leshoward/2292500360/)
- [Pretty Daschund.JPG](https://www.flickr.com/photos/56761195@N00/4775555586/)
- [Asher](https://www.flickr.com/photos/aslives/2663340348/)
- [IMG_2787](https://www.flickr.com/photos/tech4him/2574593294/)
- [Fang](https://www.flickr.com/photos/aslives/2663342508/)
- [Fridita](https://www.flickr.com/photos/lombino/3521075134/)
- [Fang](https://www.flickr.com/photos/aslives/2662516499/)
- [Asher](https://www.flickr.com/photos/aslives/2662514065/)
- [Henry](https://www.flickr.com/photos/radcliffephotos/4085406454/)
- [IMG_1534_DxO_RAW](https://www.flickr.com/photos/leshoward/2189897081/)
- [IMG_2211_800_RAW](https://www.flickr.com/photos/leshoward/2317691056/)
- [Fang](https://www.flickr.com/photos/aslives/2662507627/)
- [Henry](https://www.flickr.com/photos/radcliffephotos/4085418010/)
