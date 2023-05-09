/*
 * Copyright (C) 2023 Red Hat, Inc.
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
import React, { useState, useEffect } from "react";

import {
    Bullseye,
    Button,
    Checkbox,
    EmptyState,
    EmptyStateIcon,
    Form,
    FormGroup,
    FormSection,
    FormHelperText,
    HelperText,
    HelperTextItem,
    InputGroup,
    Spinner,
    TextInput,
    TextContent,
    TextVariants,
    Text,
    Title,
} from "@patternfly/react-core";

// eslint-disable-next-line camelcase
import { password_quality } from "cockpit-components-password.jsx";
import EyeIcon from "@patternfly/react-icons/dist/esm/icons/eye-icon";
import EyeSlashIcon from "@patternfly/react-icons/dist/esm/icons/eye-slash-icon";
import ExclamationCircleIcon from "@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon";
import ExclamationTriangleIcon from "@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon";
import CheckCircleIcon from "@patternfly/react-icons/dist/esm/icons/check-circle-icon";

import { AnacondaPage } from "../AnacondaPage.jsx";

const _ = cockpit.gettext;

const strengthLevels = [{
    id: "weak",
    label: _("Weak"),
    variant: "error",
    icon: <ExclamationCircleIcon />,
    lower_bound: 0,
    higher_bound: 29,
    valid: true,
}, {
    id: "medium",
    label: _("Medium"),
    variant: "warning",
    icon: <ExclamationTriangleIcon />,
    lower_bound: 30,
    higher_bound: 69,
    valid: true,
}, {
    id: "strong",
    label: _("Strong"),
    variant: "success",
    icon: <CheckCircleIcon />,
    lower_bound: 70,
    higher_bound: 100,
    valid: true,
}];

export function StorageEncryptionState (password = "", confirmPassword = "", encrypt = false) {
    this.password = password;
    this.confirmPassword = confirmPassword;
    this.encrypt = encrypt;
}

const passwordStrengthLabel = (idPrefix, strength) => {
    const level = strengthLevels.filter(l => l.id === strength)[0];
    if (level) {
        return (
            <HelperText>
                <HelperTextItem id={idPrefix + "-password-strength-label"} variant={level.variant} icon={level.icon}>
                    {level.label}
                </HelperTextItem>
            </HelperText>
        );
    }
};

// TODO create strengthLevels object with methods passed to the component ?
const PasswordFormFields = ({
    idPrefix,
    password,
    passwordLabel,
    onChange,
    passwordConfirm,
    passwordConfirmLabel,
    onConfirmChange,
    passwordStrength,
    ruleLength,
    ruleConfirmMatches
}) => {
    const [passwordHidden, setPasswordHidden] = useState(true);
    const [confirmHidden, setConfirmHidden] = useState(true);
    return (
        <>
            <FormGroup
              label={passwordLabel}
              labelInfo={ruleLength === "success" && passwordStrengthLabel(idPrefix, passwordStrength)}
            >
                <InputGroup>
                    <TextInput
                      type={passwordHidden ? "password" : "text"}
                      value={password}
                      onChange={onChange}
                      id={idPrefix + "-password-field"}
                    />
                    <Button
                      variant="control"
                      onClick={() => setPasswordHidden(!passwordHidden)}
                      aria-label={passwordHidden ? _("Show password") : _("Hide password")}
                    >
                        {passwordHidden ? <EyeIcon /> : <EyeSlashIcon />}
                    </Button>
                </InputGroup>
                <FormHelperText isHidden={false} component="div">
                    <HelperText component="ul" aria-live="polite" id={idPrefix + "-password-field-helper"}>
                        <HelperTextItem
                          id={idPrefix + "-password-rule-8-chars"}
                          isDynamic
                          variant={ruleLength}
                          component="li"
                        >
                            {_("Must be at least 8 characters")}
                        </HelperTextItem>
                    </HelperText>
                </FormHelperText>
            </FormGroup>
            <FormGroup
              label={passwordConfirmLabel}
            >
                <InputGroup>
                    <TextInput
                      type={confirmHidden ? "password" : "text"}
                      value={passwordConfirm}
                      onChange={onConfirmChange}
                      id={idPrefix + "-password-confirm-field"}
                    />
                    <Button
                      variant="control"
                      onClick={() => setConfirmHidden(!confirmHidden)}
                      aria-label={confirmHidden ? _("Show confirmed password") : _("Hide confirmed password")}
                    >
                        {confirmHidden ? <EyeIcon /> : <EyeSlashIcon />}
                    </Button>
                </InputGroup>
                <FormHelperText isHidden={false} component="div">
                    <HelperText component="ul" aria-live="polite" id="password-confirm-field-helper">
                        <HelperTextItem
                          id={idPrefix + "-password-rule-match"}
                          isDynamic
                          variant={ruleConfirmMatches}
                          component="li"
                        >
                            {_("Passphrases must match")}
                        </HelperTextItem>
                    </HelperText>
                </FormHelperText>
            </FormGroup>
        </>
    );
};

const getPasswordStrength = async (password) => {
    // In case of unacceptable password just return 0
    const force = true;
    const quality = await password_quality(password, force);
    const level = strengthLevels.filter(l => l.lower_bound <= quality.value && l.higher_bound >= quality.value)[0];
    return level.id;
};

const isValidStrength = (strength) => {
    const level = strengthLevels.filter(l => l.id === strength)[0];
    return level ? level.valid : false;
};

const getRuleLength = (password) => {
    let ruleState = "indeterminate";
    if (password.length > 0 && password.length <= 7) {
        ruleState = "error";
    } else if (password.length > 7) {
        ruleState = "success";
    }
    return ruleState;
};

const getRuleConfirmMatches = (password, confirm) => (password.length > 0 ? (password === confirm ? "success" : "error") : "indeterminate");

const CheckDisksSpinner = (
    <Bullseye>
        <EmptyState id="installation-destination-next-spinner">
            <EmptyStateIcon variant="container" component={Spinner} />
            <Title size="lg" headingLevel="h4">
                {_("Checking storage configuration")}
            </Title>
            <TextContent>
                <Text component={TextVariants.p}>
                    {_("This may take a moment")}
                </Text>
            </TextContent>
        </EmptyState>
    </Bullseye>
);

export const DiskEncryption = ({
    idPrefix,
    isInProgress,
    setIsFormValid,
    storageEncryption,
    setStorageEncryption,
    showPassphraseScreen,
}) => {
    const [password, setPassword] = useState(storageEncryption.password);
    const [confirmPassword, setConfirmPassword] = useState(storageEncryption.confirmPassword);
    const [passwordStrength, setPasswordStrength] = useState("");
    const [ruleLength, setRuleLength] = useState("indeterminate");
    const [ruleConfirmMatches, setRuleConfirmMatches] = useState("indeterminate");
    const encryptedDevicesCheckbox = (
        <Checkbox
          id={idPrefix + "-encrypt-devices"}
          label={_("Yes, I want device encryption (optional)")}
          description={_(
              "If you select this option you will be asked to create an encryption passphrase." +
              " You will use the passphrase to access your data when you start your computer." +
              " You won't be able to switch between keyboard layouts (from the default one)" +
              " when you decrypt your disks after install."
          )}
          isChecked={storageEncryption.encrypt}
          onChange={(encrypt) => setStorageEncryption(se => ({ ...se, encrypt }))}
        />
    );

    const passphraseForm = (
        <Form>
            <FormSection
              title={_("Create a passphrase")}
              titleElement="h3"
            >
                <PasswordFormFields
                  idPrefix={idPrefix}
                  password={password}
                  passwordLabel={_("Passphrase")}
                  passwordStrength={passwordStrength}
                  passwordConfirm={confirmPassword}
                  passwordConfirmLabel={_("Confirm passphrase")}
                  ruleLength={ruleLength}
                  ruleConfirmMatches={ruleConfirmMatches}
                  onChange={setPassword}
                  onConfirmChange={setConfirmPassword}
                />
            </FormSection>
        </Form>
    );

    useEffect(() => {
        const updateValidity = async (password, confirmPassword, showPassphraseScreen) => {
            const passwordStrength = await getPasswordStrength(password);
            setPasswordStrength(passwordStrength);
            const ruleLength = getRuleLength(password);
            setRuleLength(ruleLength);
            const ruleConfirmMatches = getRuleConfirmMatches(password, confirmPassword);
            setRuleConfirmMatches(ruleConfirmMatches);
            const passphraseValid = (
                ruleLength === "success" &&
                ruleConfirmMatches === "success" &&
                isValidStrength(passwordStrength)
            );
            setIsFormValid(!showPassphraseScreen || passphraseValid);
        };

        updateValidity(password, confirmPassword, showPassphraseScreen);
    }, [setIsFormValid, showPassphraseScreen, password, confirmPassword]);

    useEffect(() => {
        setStorageEncryption(se => ({ ...se, password, confirmPassword }));
    }, [password, confirmPassword, setStorageEncryption]);

    if (isInProgress) {
        return CheckDisksSpinner;
    }

    return (
        <AnacondaPage title={_("Encrypt the selected devices?")}>
            <TextContent>
                {_(
                    "You can create encrypted devices during installation." +
                    " This allows you to easily configure a system with encrypted partitions." +
                    " To enable block device encryption, check the \"Encrypt System\" checkbox"
                )}
            </TextContent>
            {showPassphraseScreen ? passphraseForm : encryptedDevicesCheckbox}
        </AnacondaPage>

    );
};
