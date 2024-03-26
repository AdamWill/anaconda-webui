/*
 * Copyright (C) 2022 Red Hat, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with This program; If not, see <http://www.gnu.org/licenses/>.
 */

import cockpit from "cockpit";

import React, { useContext, useEffect, useState } from "react";
import {
    Alert,
    Divider,
    Form,
    FormGroup,
    Menu,
    MenuContent,
    MenuGroup,
    MenuItem,
    MenuList,
    MenuSearch,
    MenuSearchInput,
    SearchInput, Title,
} from "@patternfly/react-core";

import { setLocale } from "../../apis/boss.js";
import {
    setLanguage,
} from "../../apis/localization.js";

import {
    convertToCockpitLang,
    getLangCookie,
    setLangCookie
} from "../../helpers/language.js";

import { LanguageContext, OsReleaseContext, SystemTypeContext } from "../Common.jsx";

import "./InstallationLanguage.scss";

const _ = cockpit.gettext;

const getLanguageEnglishName = lang => lang["english-name"].v;
const getLanguageId = lang => lang["language-id"].v;
const getLanguageNativeName = lang => lang["native-name"].v;
const getLocaleId = locale => locale["locale-id"].v;
const getLocaleNativeName = locale => locale["native-name"].v;

class LanguageSelector extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            search: "",
        };

        this.updateNativeName = this.updateNativeName.bind(this);
        this.renderOptions = this.renderOptions.bind(this);
    }

    componentDidMount () {
        try {
            const cockpitLang = convertToCockpitLang({ lang: this.props.language });
            if (getLangCookie() !== cockpitLang) {
                setLangCookie({ cockpitLang });
                window.location.reload(true);
            }
            setLocale({ locale: this.props.language });
        } catch (e) {
            this.props.setStepNotification(e);
        }
    }

    async updateNativeName (localeItem) {
        this.props.setNativeName(getLocaleNativeName(localeItem));
    }

    renderOptions (filter) {
        const { commonLocales, languages } = this.props;
        const idPrefix = this.props.idPrefix;
        const filterLow = filter.toLowerCase();

        const filtered = [];

        // Is set to true when the first instance of a selected item is found.
        let foundSelected = false;
        // Returns a locale with a given code.
        const findLocaleWithId = (localeCode) => {
            for (const languageId in languages) {
                const languageItem = languages[languageId];
                for (const locale of languageItem.locales) {
                    if (getLocaleId(locale) === localeCode) {
                        return locale;
                    }
                }
            }
            console.warn(`Locale with code ${localeCode} not found.`);
        };

        // Returns a new instance of MenuItem from a given locale and with given prefix in it's key
        // and id.
        const createMenuItem = (locale, prefix) => {
            const isSelected = this.props.language === getLocaleId(locale);

            // Creating a ref that will be applied to the selected language and cause it to scroll into view.
            const scrollRef = (isSelected && !foundSelected)
                ? (ref) => {
                    if (ref) {
                        ref.scrollIntoView({ block: "center" });
                    }
                }
                : undefined;

            const item = (
                <MenuItem
                  id={idPrefix + "-" + prefix + getLocaleId(locale).split(".UTF-8")[0]}
                  key={prefix + getLocaleId(locale)}
                  isSelected={isSelected}
                  itemId={getLocaleId(locale)}
                  ref={scrollRef}
                  style={isSelected ? { backgroundColor: "var(--pf-v5-c-menu__list-item--hover--BackgroundColor)" } : undefined}
                >
                    {getLocaleNativeName(locale)}
                </MenuItem>
            );

            // Prevent assigning scrollRef twice to languages that are both in common list and the alphabetical list.
            if (isSelected) {
                foundSelected = true;
            }

            return item;
        };

        // List common languages.
        if (!filter) {
            filtered.push(
                <React.Fragment key="group-common-languages">
                    <MenuGroup
                      label={_("Common languages")}
                      id={idPrefix + "-common-languages"}
                      labelHeadingLevel="h3"
                    >
                        {
                            commonLocales
                                    .map(findLocaleWithId)
                                    .filter(locale => locale)
                                    .map(locale => createMenuItem(locale, "option-common-"))
                        }
                    </MenuGroup>
                    <Divider />
                </React.Fragment>
            );
        }

        // List alphabetically.
        const languagesIds = Object.keys(languages).sort();
        for (const languageId of languagesIds) {
            const languageItem = languages[languageId];
            const label = cockpit.format("$0 ($1)", getLanguageNativeName(languageItem.languageData), getLanguageEnglishName(languageItem.languageData));

            if (!filter || label.toLowerCase().indexOf(filterLow) !== -1) {
                filtered.push(
                    <MenuGroup
                      label={label}
                      labelHeadingLevel="h3"
                      id={idPrefix + "-group-" + getLanguageId(languageItem.languageData)}
                      key={"group-" + getLanguageId(languageItem.languageData)}
                    >
                        {languageItem.locales.map(locale => createMenuItem(locale, "option-alpha-"))}
                    </MenuGroup>
                );
            }
        }

        if (this.state.search && filtered.length === 0) {
            return [
                <MenuItem
                  id={idPrefix + "search-no-result"}
                  isDisabled
                  key="no-result"
                >
                    {_("No results found")}
                </MenuItem>
            ];
        }

        return filtered;
    }

    render () {
        const { lang } = this.state;
        const { languages } = this.props;

        const handleOnSelect = (_event, item) => {
            for (const languageItem in languages) {
                for (const localeItem of languages[languageItem].locales) {
                    if (getLocaleId(localeItem) === item) {
                        setLangCookie({ cockpitLang: convertToCockpitLang({ lang: getLocaleId(localeItem) }) });
                        setLanguage({ lang: getLocaleId(localeItem) })
                                .then(() => setLocale({ locale: getLocaleId(localeItem) }))
                                .catch(ex => {
                                    console.info({ ex });
                                    this.props.setStepNotification(ex);
                                });
                        this.setState({ lang: item });
                        this.updateNativeName(localeItem);
                        fetch("po.js").then(response => response.text())
                                .then(body => {
                                    // always reset old translations
                                    cockpit.locale(null);
                                    // en_US is always null
                                    if (body.trim() === "") {
                                        cockpit.locale(null);
                                    } else {
                                        // eslint-disable-next-line no-eval
                                        eval(body);

                                        const langEvent = new CustomEvent("cockpit-lang");
                                        window.dispatchEvent(langEvent);
                                    }
                                    this.props.reRenderApp(item);
                                });
                        return;
                    }
                }
            }
        };

        const options = this.renderOptions(this.state.search);

        return (
            <Menu
              id={this.props.idPrefix + "-language-menu"}
              isScrollable
              onSelect={handleOnSelect}
              aria-invalid={!lang}
            >
                <MenuSearch>
                    <MenuSearchInput>
                        <Title
                          headingLevel="h3"
                          className="pf-v5-c-menu__group-title"
                          style={
                              // HACK This title should look like the ones in PF Menu. Simply adding it's class
                              // doesn't give it all the attributes.
                              {
                                  color: "var(--pf-v5-c-menu__group-title--Color)",
                                  fontFamily: "var(--pf-v5-global--FontFamily--sans-serif)",
                                  fontSize: "var(--pf-v5-c-menu__group-title--FontSize)",
                                  fontWeight: "var(--pf-v5-c-menu__group-title--FontWeight)",
                                  marginBottom: "0.5em",
                                  paddingLeft: "0",
                                  paddingTop: "0"
                              }
                          }
                        >
                            {_("Find a language")}
                        </Title>
                        <SearchInput
                          id={this.props.idPrefix + "-language-search"}
                          value={this.state.search}
                          onChange={(_, value) => this.setState({ search: value })}
                          onClear={() => this.setState({ search: "" })}
                        />
                    </MenuSearchInput>
                </MenuSearch>
                <MenuContent maxMenuHeight="25vh">
                    <MenuList>
                        {options}
                    </MenuList>
                </MenuContent>
            </Menu>
        );
    }
}

const InstallationLanguage = ({ idPrefix, setIsFormValid, setStepNotification }) => {
    const { commonLocales, language, languages } = useContext(LanguageContext);
    const [nativeName, setNativeName] = useState(false);
    useEffect(() => {
        setIsFormValid(language !== "");
    }, [language, setIsFormValid]);

    return (
        <>
            <Title
              headingLevel="h3"
            >
                {_("Choose a language")}
            </Title>
            <Form>
                <FormGroup isRequired>
                    {nativeName && (
                        <Alert
                          id="language-alert"
                          isInline
                          variant="info"
                          title={_("Chosen language: ") + `${nativeName}`}
                        >
                            {_("The chosen language will be used for installation and in the installed software. " +
                               "To use a different language, find it in the language list.")}
                        </Alert>
                    )}
                    <LanguageSelector
                      id="language-selector"
                      idPrefix={idPrefix}
                      languages={languages}
                      commonLocales={commonLocales}
                      language={language}
                      setIsFormValid={setIsFormValid}
                      setStepNotification={setStepNotification}
                      setNativeName={setNativeName}
                      reRenderApp={setLanguage}
                    />
                </FormGroup>
            </Form>
        </>
    );
};

export const usePage = () => {
    const osRelease = useContext(OsReleaseContext);
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";

    return ({
        component: InstallationLanguage,
        id: "installation-language",
        isHidden: !isBootIso,
        label: _("Welcome"),
        title: cockpit.format(_("Welcome to $0"), osRelease.NAME),
    });
};
