#!/bin/bash

get_secondme_repo_root() {
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    (cd "${script_dir}/../.." && pwd)
}

resolve_secondme_env_template() {
    local repo_root="${1:-$(get_secondme_repo_root)}"
    local candidate

    for candidate in "${repo_root}/.env.template" "${repo_root}/.env.example"; do
        if [[ -f "$candidate" ]]; then
            echo "$candidate"
            return 0
        fi
    done

    return 1
}

resolve_secondme_env_file() {
    local repo_root="${1:-$(get_secondme_repo_root)}"
    local local_env="${repo_root}/.env"

    if [[ -f "$local_env" ]]; then
        echo "$local_env"
        return 0
    fi

    resolve_secondme_env_template "$repo_root"
}

ensure_secondme_env_file() {
    local repo_root="${1:-$(get_secondme_repo_root)}"
    local local_env="${repo_root}/.env"
    local template_env

    if [[ -f "$local_env" ]]; then
        echo "$local_env"
        return 0
    fi

    template_env="$(resolve_secondme_env_template "$repo_root")" || {
        log_error "No environment template found. Expected .env.template or .env.example in ${repo_root}"
        return 1
    }

    cp "$template_env" "$local_env"
    log_warning "Created local .env from $(basename "$template_env"). Update it only if you need machine-specific overrides."
    echo "$local_env"
}

get_env_value_from_file() {
    local env_file="$1"
    local key="$2"
    local default_value="$3"
    local value=""

    if [[ -f "$env_file" ]]; then
        value="$(grep "^${key}=" "$env_file" | cut -d '=' -f2- | head -n 1)"
    fi

    if [[ -n "$value" ]]; then
        echo "$value"
    else
        echo "$default_value"
    fi
}
