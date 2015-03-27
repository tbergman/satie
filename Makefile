##
# (C) Josh Netterfield 2015
# Part of the Satie music engraver <https://github.com/ripieno/satie>.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
##

.PHONY: build lint unittest tsd _gentestsuite _tsc _stageOnly _unittestOnly _lintOnly test_all 

all: build unittest


# ---- Script to combine bundle d.ts files into a bundle --------------------------

define DTS_BUNDLE_JS
    var path = require("path");
    var bundler = require("dts-bundle");
    var dirs = {
	build:              path.join(__dirname, "..", "dist"),
	partial:            path.join(__dirname, ".partialBuild"),
    };

    var files = {
	mainDTS:            path.join(__dirname, ".partialBuild", "index.d.ts"),
	bundleDTS:          path.join(dirs.build, "satie.d.ts"),
    };
    bundler.bundle({ name: "satie", main: files.mainDTS, baseDir: dirs.partial, out: files.bundleDTS, externals: true, indent: "  " });
endef
export DTS_BUNDLE_JS


# ---- Headers for generated files ------------------------------------------------

define BRAVURA_HEADER
/**
 * Licensed under the SIL Open Font License (OFL)
 * Automatically generated by 'make bravura_metadata'
 */

var Bravura = 
endef
export BRAVURA_HEADER

define GLYPHNAMES_HEADER
/**
 * Licensed under the SIL Open Font License (OFL)
 */

var names: {[key: string]: string} = 
endef
export GLYPHNAMES_HEADER


# ---- Node dependencies and mxmljson helper --------------------------------------

./node_modules/tsd/build/cli.js:
	npm install


# ---- Standard target ------------------------------------------------------------

dist/*.js: build

build: _tsc _stageOnly

NO_COLOR=\x1b[0m
OK_COLOR=\x1b[32;01m
ERROR_COLOR=\x1b[31;01m
WARN_COLOR=\x1b[33;01m
INFO_COLOR=\x1b[36;01m

OK_STRING=$(OK_COLOR)  ...ok!$(NO_COLOR)
TSC_STRING=$(INFO_COLOR)» Building from tsconfig.json...$(NO_COLOR)
WATCH_STRING=$(INFO_COLOR)» Watching from tsconfig.json...$(NO_COLOR)
STAGE_STRING=$(INFO_COLOR)» Staging *.d.ts, *,js, *.js.map...$(NO_COLOR)
TEST_STRING=$(INFO_COLOR)» Testing __test__*.js ...$(NO_COLOR)
CLEAN_STRING=$(INFO_COLOR)» Deleting generated code ...$(NO_COLOR)
COVERAGE_STRING=$(INFO_COLOR)» Writing coverage info for __test__*.js to ./coverage ...$(NO_COLOR)
WARN_STRING=$(WARN_COLOR)[WARNINGS]$(NO_COLOR)

_tsc: _gentestsuite
	@echo "$(TSC_STRING)"
	@./node_modules/typescript/bin/tsc || (make clean; exit 1)

_gentestsuite: clean
	@echo "// Generated by 'make _gentestsuite'" > ./src/tests.ts
	@find ./src | grep -e "__tests__.*\.ts\$$" | sed 's,\./src\/\(.*\)/\(.*\)\.ts,import \2 = require("\./\1/\2");,' >> ./src/tests.ts

_stageOnly:
	@echo "$(STAGE_STRING)"
# Copy directory strucutre to output folders
	@cd src; find . -type d -print0 | xargs -0 -I _DIR_ mkdir -p ../dist/_DIR_ ../.partialBuild/_DIR_

	@cd src; find . -name "*.d.ts" -print0 | xargs -0 -I _FILE_ mv _FILE_ ../.partialBuild/_FILE_
	@cd src; find . -name "*.js" -print0 | xargs -0 -I _FILE_ mv _FILE_ ../dist/_FILE_
	@cd src; find . -name "*.js.map" -print0 | xargs -0 -I _FILE_ mv _FILE_ ../dist/_FILE_

# Create satie.d.ts for TypeScript clients
	@echo "$$DTS_BUNDLE_JS" | node

_watchStage:
	@echo "$(STAGE_STRING)"
# the completion message is sent before closing buffers!
	@make _stageOnly 2>&1 > /dev/null || (sleep 5; make _stageOnly)


# ---- Other build modes ----------------------------------------------------------

watch: _gentestsuite
	@clear
	@echo "$(WATCH_STRING)"
	@CLEAN="1"; \
	./node_modules/typescript/bin/tsc -w | \
	while read line; do \
	    if [[ $$line == *TS6042* ]]; then \
		if [[ "$$CLEAN" == "1" ]]; then \
		    echo "$(INFO_COLOR)» $$line$(NO_COLOR)"; \
		    (make _watchStage && make _unittestOnly) & \
		else \
		    echo "$(ERROR_COLOR)» $$line$(NO_COLOR)"; \
		fi; \
	    elif [[ $$line == *TS6032* ]]; then \
		clear; \
		CLEAN="1"; \
		echo "$(INFO_COLOR)» $$line$(NO_COLOR)"; \
	    else \
		CLEAN="0"; \
		echo "$(ERROR_COLOR)» $$line$(NO_COLOR)"; \
	    fi; \
	done;

tsd: ./node_modules/tsd/build/cli.js
	./node_modules/tsd/build/cli.js link -so
	./node_modules/tsd/build/cli.js update -so

smufl:
	@bash -c "echo -ne \"$$BRAVURA_HEADER\"" > ./src/models/smufl/bravura.ts
	@cat ./vendor/bravura/bravura_metadata.json | jq '{fontName: .fontName, fontVersion: .fontVersion, engravingDefaults: .engravingDefaults, glyphBBoxes: [(.glyphBBoxes | to_entries[] | .value.bBoxNE + .value.bBoxSW + [.key])], glyphsWithAnchors: .glyphsWithAnchors, ligatures: .ligatures}' >> ./src/models/smufl/bravura.ts
	@echo "; export = Bravura;" >> ./src/models/smufl/bravura.ts
	
	@bash -c "echo -ne \"$$GLYPHNAMES_HEADER\"" > ./src/models/smufl/glyphnames.ts
	@cat ./vendor/smufl/glyphnames.json  | jq '[to_entries[] | {key: .key, value: .value.codepoint}] | from_entries' >> ./src/models/smufl/glyphnames.ts
	@echo "; export = names;" >> ./src/models/smufl/glyphnames.ts
	@echo "$(INFO_COLOR)» SMuFL built successfully.$(NO_COLOR)"; \

lint:
	find ./src -regex ".*[a-zA-Z0-9_][a-zA-Z0-9_]\.ts" | grep -v src/tests.ts | sed 's/\(.*\)/-f\1/g' | xargs ./node_modules/tslint/bin/tslint -c ./tsconfig.json 

unittest: build _unittestOnly

_unittestOnly:
	@echo "$(TEST_STRING)"
	@find ./dist -type f | grep "__tests__.*js\$$" | xargs ./node_modules/mocha/bin/mocha -R progress

test_all: unittest lint

coverage: build
	@echo "$(COVERAGE_STRING)"
	@find ./dist -type f | grep "__tests__.*js\$$" | xargs istanbul cover node_modules/mocha/bin/_mocha -- -R progress

clean:
	@echo "$(CLEAN_STRING)"
	@rm -rf ./.partialBuild
	@rm -rf ./dist
	@cd src; find . -name "*.d.ts" -print0 | xargs -0 -I _FILE_ rm _FILE_
	@cd src; find . -name "*.js" -print0 | xargs -0 -I _FILE_ rm _FILE_
	@cd src; find . -name "*.js.map" -print0 | xargs -0 -I _FILE_ rm _FILE_